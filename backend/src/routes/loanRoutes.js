const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

router.use(authenticate);

router.get('/', loanController.listLoans);
router.post('/', loanController.createLoan);
router.get('/:id', loanController.getLoanById);
router.post('/:id/close', authorize('ADMIN', 'STAFF'), loanController.closeLoanAndReleaseCollateral);

module.exports = router;
