const db = require('../config/db');

/**
 * Get shop dashboard KPIs and metrics
 */
const getDashboardMetrics = async (req, res) => {
  try {
    // 1. Active Loans & Principal
    const loansSummaryRes = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_loans_count,
        COALESCE(SUM(outstanding_principal) FILTER (WHERE status = 'ACTIVE'), 0) AS total_active_principal,
        COUNT(*) FILTER (WHERE status = 'OVERDUE') AS overdue_loans_count,
        COALESCE(SUM(outstanding_principal) FILTER (WHERE status = 'OVERDUE'), 0) AS total_overdue_principal,
        COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_loans_count
      FROM loans;
    `);

    // 2. Total Gold & Silver Weight Held in Vault
    const vaultSummaryRes = await db.query(`
      SELECT 
        metal_type,
        karat,
        COUNT(*) AS item_count,
        COALESCE(SUM(gross_weight_grams), 0) AS total_gross_weight,
        COALESCE(SUM(net_weight_grams), 0) AS total_net_weight,
        COALESCE(SUM(appraised_value), 0) AS total_appraised_value
      FROM pledged_items
      WHERE status = 'IN_VAULT'
      GROUP BY metal_type, karat
      ORDER BY metal_type, karat;
    `);

    // Total gold net grams in vault
    const totalGoldNetGrams = vaultSummaryRes.rows
      .filter((r) => r.metal_type === 'GOLD')
      .reduce((acc, curr) => acc + parseFloat(curr.total_net_weight), 0);

    const totalSilverNetGrams = vaultSummaryRes.rows
      .filter((r) => r.metal_type === 'SILVER')
      .reduce((acc, curr) => acc + parseFloat(curr.total_net_weight), 0);

    // 3. Current Month Cash Collections (Interest vs Principal)
    const monthCollectionRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount_paid), 0) AS total_collected_month,
        COALESCE(SUM(interest_portion), 0) AS interest_collected_month,
        COALESCE(SUM(principal_portion), 0) AS principal_collected_month,
        COUNT(*) AS transactions_count_month
      FROM payments
      WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE);
    `);

    // Today's collections
    const todayCollectionRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount_paid), 0) AS total_today,
        COUNT(*) AS tx_today
      FROM payments
      WHERE payment_date = CURRENT_DATE;
    `);

    // 4. Overdue Account Alerts (Top overdue accounts needing immediate contact)
    const overdueAlertsRes = await db.query(`
      SELECT 
        l.id,
        l.loan_number,
        l.outstanding_principal,
        l.due_date,
        l.monthly_interest_rate_pct,
        l.total_interest_accrued - l.total_interest_paid AS estimated_interest_due,
        (CURRENT_DATE - l.due_date) AS days_overdue,
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.status = 'OVERDUE' OR (l.status = 'ACTIVE' AND l.due_date < CURRENT_DATE)
      ORDER BY days_overdue DESC
      LIMIT 10;
    `);

    // 5. Recent 5 Loans
    const recentLoansRes = await db.query(`
      SELECT 
        l.id,
        l.loan_number,
        l.principal_amount,
        l.outstanding_principal,
        l.start_date,
        l.due_date,
        l.status,
        c.full_name AS customer_name,
        c.phone AS customer_phone
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 5;
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          activeLoansCount: parseInt(loansSummaryRes.rows[0].active_loans_count, 10),
          totalActivePrincipal: parseFloat(loansSummaryRes.rows[0].total_active_principal),
          overdueLoansCount: parseInt(loansSummaryRes.rows[0].overdue_loans_count, 10),
          totalOverduePrincipal: parseFloat(loansSummaryRes.rows[0].total_overdue_principal),
          closedLoansCount: parseInt(loansSummaryRes.rows[0].closed_loans_count, 10),
        },
        vault: {
          totalGoldNetGrams: Number(totalGoldNetGrams.toFixed(3)),
          totalSilverNetGrams: Number(totalSilverNetGrams.toFixed(3)),
          breakdown: vaultSummaryRes.rows,
        },
        collections: {
          thisMonth: {
            total: parseFloat(monthCollectionRes.rows[0].total_collected_month),
            interest: parseFloat(monthCollectionRes.rows[0].interest_collected_month),
            principal: parseFloat(monthCollectionRes.rows[0].principal_collected_month),
            txCount: parseInt(monthCollectionRes.rows[0].transactions_count_month, 10),
          },
          today: {
            total: parseFloat(todayCollectionRes.rows[0].total_today),
            txCount: parseInt(todayCollectionRes.rows[0].tx_today, 10),
          },
        },
        overdueAlerts: overdueAlertsRes.rows,
        recentLoans: recentLoansRes.rows,
      },
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics', error: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
};
