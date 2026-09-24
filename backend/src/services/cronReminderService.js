/**
 * Automated Cron Job Engine for WhatsApp & SMS Reminders
 * Scans active & overdue loans and sends scheduled notifications
 */

const db = require('../config/db');
const { calculateAccruedInterest } = require('./interestEngine');
const { sendMonthlyDueReminder, sendOverdueNotice } = require('./messagingService');

/**
 * Main routine to scan and process reminders
 */
const runDailyReminderRoutine = async () => {
  console.log(`\n[CRON ${new Date().toISOString()}] Starting automated reminder sweep...`);

  const client = await db.getClient();
  const summary = {
    scanned: 0,
    dueRemindersSent: 0,
    overdueNoticesSent: 0,
    skippedRecentlySent: 0,
    errors: 0,
  };

  try {
    // Fetch all active or overdue loans with customer details
    const query = `
      SELECT 
        l.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.status IN ('ACTIVE', 'OVERDUE')
      ORDER BY l.due_date ASC;
    `;
    const result = await client.query(query);
    summary.scanned = result.rows.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const loan of result.rows) {
      try {
        const customer = {
          id: loan.customer_id,
          full_name: loan.customer_name,
          phone: loan.customer_phone,
        };

        const financials = calculateAccruedInterest(loan, today);
        const dueDate = new Date(loan.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const diffDaysToDue = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

        // 1. Check if reminder was already sent in the last 48 hours for this loan
        const recentReminderCheck = await client.query(
          `SELECT id, reminder_type, sent_at FROM reminder_logs 
           WHERE loan_id = $1 
             AND sent_at > NOW() - INTERVAL '48 hours'
             AND status = 'SENT'
           ORDER BY sent_at DESC LIMIT 1;`,
          [loan.id]
        );

        if (recentReminderCheck.rows.length > 0) {
          summary.skippedRecentlySent++;
          continue;
        }

        // Scenario A: Due in next 3 days OR Due Today
        if (diffDaysToDue >= 0 && diffDaysToDue <= 3) {
          console.log(`Sending Monthly Due reminder to ${customer.full_name} for loan ${loan.loan_number} (Due in ${diffDaysToDue} days)`);
          await sendMonthlyDueReminder(loan, customer, financials);
          summary.dueRemindersSent++;
        }
        // Scenario B: Overdue past grace period
        else if (diffDaysToDue < -loan.grace_period_days || financials.isOverdue) {
          // Update loan status to OVERDUE in database if not already marked
          if (loan.status !== 'OVERDUE') {
            await client.query(`UPDATE loans SET status = 'OVERDUE' WHERE id = $1`, [loan.id]);
          }

          console.log(`Sending Overdue Notice to ${customer.full_name} for loan ${loan.loan_number} (${financials.overdueDays} days overdue)`);
          await sendOverdueNotice(loan, customer, financials);
          summary.overdueNoticesSent++;
        }
      } catch (itemError) {
        console.error(`Error processing reminder for loan ${loan.loan_number}:`, itemError.message);
        summary.errors++;
      }
    }

    console.log(`[CRON SUMMARY] Complete: Scanned: ${summary.scanned}, Due Sent: ${summary.dueRemindersSent}, Overdue Sent: ${summary.overdueNoticesSent}, Skipped: ${summary.skippedRecentlySent}, Errors: ${summary.errors}\n`);
    return summary;
  } catch (err) {
    console.error('[CRON FATAL] Scheduled reminder routine error:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  runDailyReminderRoutine,
};
