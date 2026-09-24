const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.post('/login', authController.login);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/staff', authenticate, authorize('ADMIN'), authController.createStaffUser);

module.exports = router;
