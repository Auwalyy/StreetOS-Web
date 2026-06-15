const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const { createSale, getSales, getSale, getSalesSummary, voidSale } = require('../controllers/salesController');

router.use(protect, requireBusiness);
router.get('/summary', getSalesSummary);
router.route('/').get(getSales).post(createSale);
router.get('/:id', getSale);
router.post('/:id/void', voidSale);

module.exports = router;
