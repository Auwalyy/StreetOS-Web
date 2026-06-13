const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const { upload } = require('../middleware/upload');
const {
  createBusiness, getMyBusinesses, getBusiness,
  updateBusiness, uploadLogo, deleteBusiness, getBusinessStats,
} = require('../controllers/businessController');

router.use(protect);
router.post('/', createBusiness);
router.get('/', getMyBusinesses);
router.get('/:id', getBusiness);
router.put('/:id', updateBusiness);
router.delete('/:id', deleteBusiness);
router.post('/:id/logo', upload.single('logo'), uploadLogo);
router.get('/:businessId/stats', requireBusiness, getBusinessStats);

module.exports = router;
