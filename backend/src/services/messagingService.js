/**
 * Messaging Service: WhatsApp Cloud API & Twilio SMS Integration
 * Sends payment reminders, receipts, and overdue notices with automatic audit logging
 */

const axios = require('axios');
const db = require('../config/db');

// Twilio Client Setup
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.warn('Twilio library not initialized:', err.message);
  }
}

/**
 * Format phone number to E.164 standard (e.g. +919876543210)
 */
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned; // Default country code if 10 digits
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
};

/**
 * Send WhatsApp message using Meta Graph Cloud API
 */
const sendWhatsAppMessage = async ({ toPhone, messageText, templateName = null, components = [] }) => {
  const formattedPhone = formatPhoneNumber(toPhone);
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

  // If in local/dev without live credentials, simulate delivery and log
  if (!accessToken || !phoneNumberId || process.env.WHATSAPP_API_ENABLED === 'false') {
    console.log(`[SIMULATED WHATSAPP] To: ${formattedPhone} | Content:\n${messageText}`);
    return {
      success: true,
      messageId: `sim-wa-${Date.now()}`,
      status: 'SENT',
      simulated: true,
    };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  let payload;
  if (templateName) {
    payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components,
      },
    };
  } else {
    payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone.replace('+', ''),
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const msgId = response.data?.messages?.[0]?.id || `wa-${Date.now()}`;
    return {
      success: true,
      messageId: msgId,
      status: 'SENT',
    };
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`WhatsApp API Error for ${formattedPhone}:`, errorDetails);
    throw new Error(`WhatsApp API failed: ${errorDetails}`);
  }
};

/**
 * Send SMS using Twilio (or fallback provider)
 */
const sendSmsMessage = async ({ toPhone, messageText }) => {
  const formattedPhone = formatPhoneNumber(toPhone);

  if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(`[SIMULATED SMS] To: ${formattedPhone} | Content:\n${messageText}`);
    return {
      success: true,
      messageId: `sim-sms-${Date.now()}`,
      status: 'SENT',
      simulated: true,
    };
  }

  try {
    const message = await twilioClient.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    return {
      success: true,
      messageId: message.sid,
      status: 'SENT',
    };
  } catch (error) {
    console.error(`SMS Error for ${formattedPhone}:`, error.message);
    throw error;
  }
};

/**
 * Dispatch message with WhatsApp primary and SMS fallback, saving log to DB
 */
const dispatchNotification = async ({
  loanId,
  customerId,
  phone,
  reminderType,
  messageText,
  templateName = null,
  preferChannel = 'WHATSAPP',
}) => {
  let deliveryResult = null;
  let usedChannel = preferChannel;
  let status = 'QUEUED';
  let errorMessage = null;

  try {
    if (preferChannel === 'WHATSAPP') {
      try {
        deliveryResult = await sendWhatsAppMessage({ toPhone: phone, messageText, templateName });
        status = 'SENT';
      } catch (waErr) {
        console.warn(`WhatsApp dispatch failed, falling back to SMS for loan ${loanId}:`, waErr.message);
        usedChannel = 'SMS';
        deliveryResult = await sendSmsMessage({ toPhone: phone, messageText });
        status = 'SENT';
      }
    } else {
      deliveryResult = await sendSmsMessage({ toPhone: phone, messageText });
      status = 'SENT';
    }
  } catch (err) {
    status = 'FAILED';
    errorMessage = err.message;
  }

  // Record into reminder_logs table
  try {
    const insertQuery = `
      INSERT INTO reminder_logs (
        loan_id, customer_id, channel, reminder_type, 
        recipient_phone, template_name, message_body, 
        external_message_id, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, sent_at;
    `;
    await db.query(insertQuery, [
      loanId,
      customerId,
      usedChannel,
      reminderType,
      phone,
      templateName,
      messageText,
      deliveryResult?.messageId || null,
      status,
      errorMessage,
    ]);
  } catch (dbErr) {
    console.error('Failed to log reminder to database:', dbErr.message);
  }

  return {
    success: status === 'SENT',
    channel: usedChannel,
    status,
    messageId: deliveryResult?.messageId,
  };
};

/**
 * High-level notification helpers
 */

// 1. Monthly Due Reminder
const sendMonthlyDueReminder = async (loan, customer, financialSummary) => {
  const shopName = process.env.SHOP_NAME || 'Swarna Laxmi Bankers';
  const shopPhone = process.env.SHOP_PHONE || '+91 98765 43210';
  
  const text = 
`🔔 *${shopName} - Monthly Interest Reminder*
Dear *${customer.full_name}*,

This is a friendly reminder that the monthly interest payment for your Gold Loan is due.

📄 *Loan A/c:* ${loan.loan_number}
💰 *Principal Amount:* ₹${parseFloat(loan.outstanding_principal).toLocaleString('en-IN')}
📅 *Due Date:* ${new Date(loan.due_date).toLocaleDateString('en-IN')}
💵 *Monthly Interest Due:* ₹${financialSummary.monthlyInterest.toLocaleString('en-IN')}
⚡ *Total Outstanding Dues:* ₹${financialSummary.netInterestDue.toLocaleString('en-IN')}

Please pay on or before the due date to avoid late charges.
UPI Payment / Queries: ${shopPhone}
Thank you for banking with us!`;

  return dispatchNotification({
    loanId: loan.id,
    customerId: customer.id,
    phone: customer.phone,
    reminderType: 'MONTHLY_DUE',
    messageText: text,
    templateName: 'monthly_gold_loan_reminder',
  });
};

// 2. Transaction Receipt
const sendPaymentReceipt = async (payment, loan, customer) => {
  const shopName = process.env.SHOP_NAME || 'Swarna Laxmi Bankers';
  
  const text = 
`✅ *${shopName} - Payment Confirmation*
Dear *${customer.full_name}*,

We have received your payment. Here is your digital receipt:

🧾 *Receipt No:* ${payment.receipt_number}
📄 *Loan A/c:* ${loan.loan_number}
💵 *Amount Paid:* ₹${parseFloat(payment.amount_paid).toLocaleString('en-IN')}
🏷️ *Payment Mode:* ${payment.payment_mode}
📅 *Date:* ${new Date(payment.payment_date).toLocaleDateString('en-IN')}

*Breakdown:*
• Interest Settled: ₹${parseFloat(payment.interest_portion).toLocaleString('en-IN')}
• Principal Reduced: ₹${parseFloat(payment.principal_portion).toLocaleString('en-IN')}
• Remaining Principal: ₹${parseFloat(loan.outstanding_principal).toLocaleString('en-IN')}

Keep this receipt for your records.`;

  return dispatchNotification({
    loanId: loan.id,
    customerId: customer.id,
    phone: customer.phone,
    reminderType: 'PAYMENT_RECEIPT',
    messageText: text,
  });
};

// 3. Overdue Notice
const sendOverdueNotice = async (loan, customer, financialSummary) => {
  const shopName = process.env.SHOP_NAME || 'Swarna Laxmi Bankers';
  const shopPhone = process.env.SHOP_PHONE || '+91 98765 43210';
  
  const text = 
`⚠️ *URGENT: OVERDUE NOTICE - ${shopName}*
Dear *${customer.full_name}*,

Your Gold Loan *${loan.loan_number}* is now *${financialSummary.overdueDays} days OVERDUE*.

• *Principal:* ₹${parseFloat(loan.outstanding_principal).toLocaleString('en-IN')}
• *Unpaid Interest:* ₹${financialSummary.netInterestDue.toLocaleString('en-IN')}
• *Late Penalty:* ₹${financialSummary.penalty.toLocaleString('en-IN')}
• *Total Settlement Needed:* ₹${financialSummary.totalSettlementAmount.toLocaleString('en-IN')}

Please settle your pending dues immediately to prevent default action or collateral auction under statutory pawn regulations.
Contact manager immediately: ${shopPhone}`;

  return dispatchNotification({
    loanId: loan.id,
    customerId: customer.id,
    phone: customer.phone,
    reminderType: 'OVERDUE_ALERT',
    messageText: text,
  });
};

module.exports = {
  sendWhatsAppMessage,
  sendSmsMessage,
  dispatchNotification,
  sendMonthlyDueReminder,
  sendPaymentReceipt,
  sendOverdueNotice,
};
