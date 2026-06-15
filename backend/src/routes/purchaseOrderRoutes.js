const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const { createPurchaseOrder, getPurchaseOrders, getPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder, deletePurchaseOrder } = require('../controllers/purchaseOrderController');

router.use(protect, requireBusiness);
router.route('/').get(getPurchaseOrders).post(createPurchaseOrder);
router.route('/:id').get(getPurchaseOrder).put(updatePurchaseOrder).delete(deletePurchaseOrder);
router.post('/:id/receive', receivePurchaseOrder);

module.exports = router;
