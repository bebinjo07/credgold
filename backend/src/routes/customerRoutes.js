const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/', customerController.searchCustomers);
router.post('/', customerController.createCustomer);
router.get('/:id', customerController.getCustomerById);

module.exports = router;
