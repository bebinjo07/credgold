const db = require('../config/db');
const { calculateCollateralValuation, calculateAccruedInterest } = require('../services/interestEngine');
const { dispatchNotification } = require('../services/messagingService');

/**
 * Generate sequential Loan Number (e.g. GL-2026-0042)
 */
const generateLoanNumber = async (client) => {
  const year = new Date().getFullYear();
  const countRes = await client.query(
    `SELECT COUNT(*) FROM loans WHERE loan_number LIKE $1`,
    [`GL-${year}-%`]
  );
  const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
  return `GL-${year}-${String(nextNum).padStart(4, '0')}`;
};

/**
 * Create a new Gold Loan with Pledged Collateral Items (Atomic Transaction)
 */
const createLoan = async (req, res) => {
  const {
    customerId,
    principalAmount,
    monthlyInterestRatePct = 1.75,
    loanTermMonths = 12,
    startDate = new Date(),
    gracePeriodDays = 7,
    items, // Array of pledged collateral items
    notes,
  } = req.body;

  if (!customerId || !principalAmount || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Customer ID, loan principal amount, and at least one pledged item are required.',
    });
  }

  // Value the collateral items
  const valuation = calculateCollateralValuation(items);
  const principal = parseFloat(principalAmount);

  // Validate LTV
  if (principal > valuation.summary.maxEligibleLoan) {
    return res.status(400).json({
      success: false,
      message: `Requested loan (₹${principal.toLocaleString('en-IN')}) exceeds maximum permissible ${valuation.summary.ltvPercentage}% LTV limit of ₹${valuation.summary.maxEligibleLoan.toLocaleString('en-IN')}.`,
      appraisedValue: valuation.summary.totalAppraisedValue,
      maxEligibleLoan: valuation.summary.maxEligibleLoan,
    });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify customer exists
    const customerRes = await client.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (customerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const customer = customerRes.rows[0];

    // 2. Compute due date (start date + loanTermMonths)
    const start = new Date(startDate);
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + parseInt(loanTermMonths, 10));

    // 3. Generate Loan Number
    const loanNumber = await generateLoanNumber(client);

    // 4. Insert Loan
    const insertLoanQuery = `
      INSERT INTO loans (
        loan_number, customer_id, principal_amount, monthly_interest_rate_pct,
        loan_term_months, start_date, due_date, grace_period_days, status,
        total_interest_accrued, total_interest_paid, total_principal_paid,
        outstanding_principal, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 0, 0, 0, $9, $10, $11)
      RETURNING *;
    `;

    const loanRes = await client.query(insertLoanQuery, [
      loanNumber,
      customerId,
      principal,
      parseFloat(monthlyInterestRatePct),
      parseInt(loanTermMonths, 10),
      start,
      dueDate,
      parseInt(gracePeriodDays, 10),
      principal,
      notes || null,
      req.user.id,
    ]);

    const createdLoan = loanRes.rows[0];

    // 5. Insert Collateral Items
    const insertedItems = [];
    for (const item of valuation.items) {
      const insertItemQuery = `
        INSERT INTO pledged_items (
          loan_id, metal_type, item_description, karat, purity_pct,
          gross_weight_grams, stone_weight_grams, market_rate_per_gram,
          appraised_value, packet_number, status, photo_urls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'IN_VAULT', $11)
        RETURNING *;
      `;

      const itemRes = await client.query(insertItemQuery, [
        createdLoan.id,
        item.metal_type || 'GOLD',
        item.item_description,
        item.karat,
        item.purity_pct,
        item.gross_weight_grams,
        item.stone_weight_grams,
        item.market_rate_per_gram,
        item.appraised_value,
        item.packet_number || 'DEFAULT-VAULT',
        item.photo_urls || [],
      ]);

      insertedItems.push(itemRes.rows[0]);
    }

    // 6. Audit Trail
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_table, entity_id, changes)
       VALUES ($1, 'LOAN_CREATED', 'loans', $2, $3)`,
      [req.user.id, createdLoan.id, JSON.stringify({ loanNumber, principal, itemsCount: insertedItems.length })]
    );

    await client.query('COMMIT');

    // 7. Send Welcome / Loan Creation WhatsApp Notification
    const shopName = process.env.SHOP_NAME || 'Swarna Laxmi Bankers';
    const welcomeMsg = 
`🎉 *${shopName} - Loan Disbursed*
Dear *${customer.full_name}*,

Your Gold Loan *${createdLoan.loan_number}* has been successfully processed!

💰 *Disbursed Amount:* ₹${principal.toLocaleString('en-IN')}
⚖️ *Total Net Weight:* ${valuation.summary.totalNetWeight}g
📦 *Vault Packet ID:* ${valuation.items[0]?.packet_number || 'VAULT'}
📅 *Maturity Date:* ${dueDate.toLocaleDateString('en-IN')}
📊 *Monthly Interest:* ${monthlyInterestRatePct}% (₹${((principal * monthlyInterestRatePct) / 100).toLocaleString('en-IN')}/mo)

Your pledged gold items are safely locked in our high-security vault.
For help or repayments, visit our branch or call ${process.env.SHOP_PHONE || ''}.`;

    dispatchNotification({
      loanId: createdLoan.id,
      customerId: customer.id,
      phone: customer.phone,
      reminderType: 'LOAN_DISBURSEMENT',
      messageText: welcomeMsg,
    }).catch((e) => console.warn('Welcome msg failed to send:', e.message));

    return res.status(201).json({
      success: true,
      message: 'Loan disbursed successfully and items locked in vault',
      loan: createdLoan,
      items: insertedItems,
      valuation: valuation.summary,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to disburse loan', error: error.message });
  } finally {
    client.release();
  }
};

/**
 * List all loans with filters and calculated status
 */
const listLoans = async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    let whereClauses = [];
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`l.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(l.loan_number ILIKE $${params.length} OR c.full_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) 
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      ${whereStr};
    `;
    const countRes = await db.query(countQuery, params);
    const totalLoans = parseInt(countRes.rows[0].count, 10);

    const query = `
      SELECT 
        l.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        COUNT(p.id) AS pledged_items_count,
        COALESCE(SUM(p.net_weight_grams), 0) AS total_net_weight,
        COALESCE(SUM(p.gross_weight_grams), 0) AS total_gross_weight,
        COALESCE(SUM(p.appraised_value), 0) AS total_appraised_value
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN pledged_items p ON l.id = p.loan_id
      ${whereStr}
      GROUP BY l.id, c.id
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    params.push(parseInt(limit, 10), offset);
    const result = await db.query(query, params);

    // Calculate real-time interest dues for each active loan
    const enrichedLoans = result.rows.map((loan) => {
      const liveFinancials = calculateAccruedInterest(loan, new Date());
      return {
        ...loan,
        liveFinancials,
      };
    });

    return res.status(200).json({
      success: true,
      total: totalLoans,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalLoans / parseInt(limit, 10)),
      loans: enrichedLoans,
    });
  } catch (error) {
    console.error('List loans error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve loans', error: error.message });
  }
};

/**
 * Get Loan by ID with full collateral items, payments, and live settlement statement
 */
const getLoanById = async (req, res) => {
  const { id } = req.params;

  try {
    const loanRes = await db.query(
      `SELECT l.*, c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address, c.kyc_type, c.kyc_number
       FROM loans l
       JOIN customers c ON l.customer_id = c.id
       WHERE l.id = $1`,
      [id]
    );

    if (loanRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const loan = loanRes.rows[0];

    const itemsRes = await db.query('SELECT * FROM pledged_items WHERE loan_id = $1 ORDER BY created_at ASC', [id]);
    const paymentsRes = await db.query(
      `SELECT p.*, u.full_name AS received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.loan_id = $1
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [id]
    );

    const liveFinancials = calculateAccruedInterest(loan, new Date());

    return res.status(200).json({
      success: true,
      loan,
      items: itemsRes.rows,
      payments: paymentsRes.rows,
      liveFinancials,
    });
  } catch (error) {
    console.error('Get loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loan', error: error.message });
  }
};

/**
 * Close Loan & Release Collateral (Authorized by Admin or Staff)
 */
const closeLoanAndReleaseCollateral = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const loanRes = await client.query('SELECT * FROM loans WHERE id = $1 FOR UPDATE', [id]);
    if (loanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const loan = loanRes.rows[0];
    const liveFinancials = calculateAccruedInterest(loan, new Date());

    if (parseFloat(loan.outstanding_principal) > 0.01 || liveFinancials.netInterestDue > 1.0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot close loan with outstanding dues. Principal: ₹${loan.outstanding_principal}, Interest: ₹${liveFinancials.netInterestDue}. Please record a settlement payment first.`,
      });
    }

    // Update Loan to CLOSED
    await client.query(
      `UPDATE loans 
       SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP, released_by = $1, notes = COALESCE(notes, '') || ' ' || $2
       WHERE id = $3`,
      [req.user.id, notes || 'Loan settled and closed.', id]
    );

    // Update Collateral Items to RELEASED
    await client.query(
      `UPDATE pledged_items SET status = 'RELEASED' WHERE loan_id = $1`,
      [id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_table, entity_id, changes)
       VALUES ($1, 'LOAN_CLOSED_ITEMS_RELEASED', 'loans', $2, $3)`,
      [req.user.id, id, JSON.stringify({ releasedBy: req.user.full_name, closedAt: new Date() })]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Loan successfully marked as CLOSED and all pledged gold items released from vault.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close loan', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  createLoan,
  listLoans,
  getLoanById,
  closeLoanAndReleaseCollateral,
};
