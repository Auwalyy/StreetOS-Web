const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const {
  createProduct, getProducts, getProduct,
  updateProduct, deleteProduct, adjustStock, getLowStockProducts,
} = require('../controllers/productController');

router.use(protect, requireBusiness);
router.post('/', createProduct);
router.get('/', getProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/adjust-stock', adjustStock);

module.exports = router;
