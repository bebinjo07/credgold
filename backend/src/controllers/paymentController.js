const db = require('../config/db');
const { calculateAccruedInterest, allocateRepayment } = require('../services/interestEngine');
const { sendPaymentReceipt } = require('../services/messagingService');

/**
 * Generate sequential Receipt Number (e.g. REC-2026-0001)
 */
const generateReceiptNumber = async (client) => {
  const year = new Date().getFullYear();
  const countRes = await client.query(
    `SELECT COUNT(*) FROM payments WHERE receipt_number LIKE $1`,
    [`REC-${year}-%`]
  );
  const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
  return `REC-${year}-${String(nextNum).padStart(4, '0')}`;
};

/**
 * Record a Payment for a Loan
 */
const recordPayment = async (req, res) => {
  const {
    loanId,
    amount,
    paymentMode = 'CASH',
    transactionRef,
    notes,
    sendWhatsApp = true,
  } = req.body;

  const paymentAmount = parseFloat(amount);
  if (!loanId || isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid loan ID and payment amount are required.' });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Fetch loan with lock
    const loanRes = await client.query(
      `SELECT l.*, c.full_name AS customer_name, c.phone AS customer_phone
       FROM loans l
       JOIN customers c ON l.customer_id = c.id
       WHERE l.id = $1 FOR UPDATE`,
      [loanId]
    );

    if (loanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const loan = loanRes.rows[0];

    if (loan.status === 'CLOSED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This loan is already closed.' });
    }

    // 2. Calculate live accrued interest & allocation
    const financials = calculateAccruedInterest(loan, new Date());
    const currentPrincipal = parseFloat(loan.outstanding_principal);

    const allocation = allocateRepayment(
      paymentAmount,
      financials.netInterestDue,
      financials.penalty,
      currentPrincipal
    );

    // 3. Update Loan Record
    const newPrincipal = allocation.newPrincipal;
    const newTotalInterestPaid = parseFloat(loan.total_interest_paid) + allocation.interestPortion;
    const newTotalPrincipalPaid = parseFloat(loan.total_principal_paid) + allocation.principalPortion;
    
    // Auto status update: if overdue and dues settled, move back to ACTIVE
    let newStatus = loan.status;
    if (newStatus === 'OVERDUE' && (financials.netInterestDue - allocation.interestPortion) <= 0.01) {
      newStatus = 'ACTIVE';
    }

    await client.query(
      `UPDATE loans
       SET 
         outstanding_principal = $1,
         total_interest_paid = $2,
         total_principal_paid = $3,
         status = $4
       WHERE id = $5`,
      [newPrincipal, newTotalInterestPaid, newTotalPrincipalPaid, newStatus, loanId]
    );

    // 4. Generate Receipt & Insert Payment
    const receiptNumber = await generateReceiptNumber(client);
    const insertPaymentQuery = `
      INSERT INTO payments (
        loan_id, receipt_number, payment_date, amount_paid,
        interest_portion, principal_portion, penalty_portion,
        payment_mode, transaction_ref, received_by, whatsapp_receipt_sent, notes
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const paymentRes = await client.query(insertPaymentQuery, [
      loanId,
      receiptNumber,
      paymentAmount,
      allocation.interestPortion,
      allocation.principalPortion,
      allocation.penaltyPortion,
      paymentMode,
      transactionRef || null,
      req.user.id,
      sendWhatsApp,
      notes || null,
    ]);

    const payment = paymentRes.rows[0];

    // 5. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_table, entity_id, changes)
       VALUES ($1, 'PAYMENT_RECORDED', 'payments', $2, $3)`,
      [req.user.id, payment.id, JSON.stringify({ receiptNumber, amount: paymentAmount, allocation })]
    );

    await client.query('COMMIT');

    // 6. Send WhatsApp confirmation if requested
    if (sendWhatsApp) {
      const updatedLoan = {
        ...loan,
        outstanding_principal: newPrincipal,
      };
      const customer = {
        id: loan.customer_id,
        full_name: loan.customer_name,
        phone: loan.customer_phone,
      };

      sendPaymentReceipt(payment, updatedLoan, customer).catch((e) =>
        console.warn('Payment receipt WhatsApp failed:', e.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      allocation,
      remainingPrincipal: newPrincipal,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
  } finally {
    client.release();
  }
};

/**
 * Get Payment Details / Receipt by ID
 */
const getPaymentReceipt = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        p.*,
        l.loan_number,
        l.outstanding_principal,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        u.full_name AS received_by_name
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      JOIN users u ON p.received_by = u.id
      WHERE p.id = $1;
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment receipt not found' });
    }

    return res.status(200).json({
      success: true,
      receipt: result.rows[0],
    });
  } catch (error) {
    console.error('Fetch receipt error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch receipt', error: error.message });
  }
};

module.exports = {
  recordPayment,
  getPaymentReceipt,
};
