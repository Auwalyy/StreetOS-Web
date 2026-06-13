const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const {
  createTransaction, getTransactions, getTransaction,
  updateTransaction, deleteTransaction, getTransactionSummary, createVoiceTransaction,
} = require('../controllers/transactionController');

router.use(protect, requireBusiness);
router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/summary', getTransactionSummary);
router.post('/voice', createVoiceTransaction);
router.get('/:id', getTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
