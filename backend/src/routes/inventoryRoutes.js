const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const {
  createProduct, getProducts, getProduct, updateProduct, deleteProduct,
  archiveProduct, restoreProduct, getLowStockProducts, adjustStock,
  getProductByBarcode, getMovements, detectLeakage, getRestockForecast,
  getDeadStock, getProductPerformance, getInventoryReport,
} = require('../controllers/inventoryController');

router.use(protect, requireBusiness);

router.route('/').get(getProducts).post(createProduct);
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getMovements);
router.get('/leakage', detectLeakage);
router.get('/forecast', getRestockForecast);
router.get('/dead-stock', getDeadStock);
router.get('/performance', getProductPerformance);
router.get('/report', getInventoryReport);
router.get('/barcode/:code', getProductByBarcode);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);
router.post('/:id/archive', archiveProduct);
router.post('/:id/restore', restoreProduct);
router.post('/:id/adjust-stock', adjustStock);

module.exports = router;
