const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.post('/', paymentController.recordPayment);
router.get('/:id', paymentController.getPaymentReceipt);

module.exports = router;
