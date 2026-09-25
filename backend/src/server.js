const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const loanRoutes = require('./routes/loanRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { runDailyReminderRoutine } = require('./services/cronReminderService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT NOW()');
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      dbTime: dbCheck.rows[0].now,
    });
  } catch (err) {
    res.status(200).json({ status: 'UP', database: 'Standalone / Cloud Sync Mode' });
  }
});

// Root
app.get('/', (req, res) => {
  res.send('Gold Loan & Pawn Shop Management API is running.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Schedule Automated Reminder Cron (Runs every day at 09:00 AM if server running)
if (!process.env.VERCEL) {
  cron.schedule('0 9 * * *', async () => {
    console.log('[NODE-CRON] Triggering scheduled daily reminder job at 09:00 AM...');
    try {
      await runDailyReminderRoutine();
    } catch (err) {
      console.error('[NODE-CRON] Error during scheduled reminder sweep:', err);
    }
  });
}

// Start Server locally or when executed directly
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🌟 Swarna Gold Loan Backend Server active on port ${PORT}`);
    console.log(`🚀 API Base URL: http://localhost:${PORT}/api`);
    console.log(`⏱️  Reminder Cron: Scheduled daily at 09:00 AM`);
    console.log(`====================================================`);
  });
}

module.exports = app;
