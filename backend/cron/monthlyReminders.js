#!/usr/bin/env node
/**
 * Standalone Cron Job Script for Pawn Ledger Automated Reminders
 * Run daily at 09:00 AM:
 * Linux Crontab: 0 9 * * * /usr/bin/node /path/to/backend/cron/monthlyReminders.js >> /var/log/pawn-reminders.log 2>&1
 * Windows Task Scheduler: "node c:\path\to\monthlyReminders.js"
 */

require('dotenv').config();
const { runDailyReminderRoutine } = require('../src/services/cronReminderService');
const db = require('../src/config/db');

(async () => {
  console.log('====================================================');
  console.log('  GOLD LOAN & PAWN LEDGER - AUTOMATED REMINDER CRON ');
  console.log(`  Executed at: ${new Date().toLocaleString()}`);
  console.log('====================================================');

  try {
    const summary = await runDailyReminderRoutine();
    console.log('Cron job execution finished successfully.');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Fatal error during cron reminder run:', error);
    process.exit(1);
  }
})();
