const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const { createSale, getSales, getSale, voidSale, getSalesSummary, parseVoiceSale } = require('../controllers/posController');

router.use(protect, requireBusiness);

router.route('/').get(getSales).post(createSale);
router.get('/summary', getSalesSummary);
router.post('/voice-parse', parseVoiceSale);
router.route('/:id').get(getSale);
router.post('/:id/void', voidSale);

module.exports = router;
