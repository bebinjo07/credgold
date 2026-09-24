const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * WhatsApp Cloud API Webhook Verification (GET)
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'gold_loan_secure_webhook_token_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/**
 * WhatsApp Delivery Status & Inbound Messages (POST)
 */
router.post('/whatsapp', async (req, res) => {
  const body = req.body;

  try {
    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.statuses) {
        for (const statusObj of value.statuses) {
          const wamid = statusObj.id;
          const status = statusObj.status?.toUpperCase(); // 'SENT', 'DELIVERED', 'READ', 'FAILED'

          // Map Meta status to enum
          const mappedStatus = ['SENT', 'DELIVERED', 'FAILED'].includes(status) ? status : 'SENT';

          await db.query(
            `UPDATE reminder_logs 
             SET status = $1, error_message = $2
             WHERE external_message_id = $3`,
            [mappedStatus, statusObj.errors ? JSON.stringify(statusObj.errors) : null, wamid]
          );
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return res.status(500).send('Webhook processing error');
  }
});

module.exports = router;
