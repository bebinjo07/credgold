const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/metrics', dashboardController.getDashboardMetrics);

module.exports = router;
