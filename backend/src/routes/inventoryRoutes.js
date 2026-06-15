const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const {
  createProduct, getProducts, getProduct, getProductByBarcode,
  updateProduct, archiveProduct, restoreProduct,
  adjustStock, getLowStockProducts,
  getMovements, detectLeakage, getForecast,
  getDeadStock, getReport,
} = require('../controllers/inventoryController');

router.use(protect, requireBusiness);

// Report & analytics (before /:id to avoid param conflict)
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getMovements);
router.get('/leakage', detectLeakage);
router.get('/forecast', getForecast);
router.get('/dead-stock', getDeadStock);
router.get('/report', getReport);
router.get('/barcode/:code', getProductByBarcode);

// CRUD
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct);
router.post('/:id/adjust-stock', adjustStock);
router.post('/:id/archive', archiveProduct);
router.post('/:id/restore', restoreProduct);

module.exports = router;
