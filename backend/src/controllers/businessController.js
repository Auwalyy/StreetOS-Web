const Business = require('../models/Business');
const { uploadToCloudinary } = require('../middleware/upload');
const { successResponse, errorResponse } = require('../utils/response');

exports.createBusiness = async (req, res) => {
  const exists = await Business.findOne({ owner: req.user._id, name: req.body.name });
  if (exists) return errorResponse(res, 'Business with this name already exists', 400);
  const business = await Business.create({ ...req.body, owner: req.user._id });
  return successResponse(res, business, 'Business created', 201);
};

exports.getMyBusinesses = async (req, res) => {
  const businesses = await Business.find({ owner: req.user._id, isActive: true });
  return successResponse(res, businesses);
};

exports.getBusiness = async (req, res) => {
  const business = await Business.findById(req.params.id).populate('owner', 'firstName lastName email');
  if (!business) return errorResponse(res, 'Business not found', 404);
  return successResponse(res, business);
};

exports.updateBusiness = async (req, res) => {
  const business = await Business.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!business) return errorResponse(res, 'Business not found', 404);
  return successResponse(res, business, 'Business updated');
};

exports.uploadLogo = async (req, res) => {
  if (!req.file) return errorResponse(res, 'No file uploaded', 400);
  const result = await uploadToCloudinary(req.file.buffer, 'logos', `business-${req.params.id}`);
  const business = await Business.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { logo: result.secure_url },
    { new: true }
  );
  return successResponse(res, business, 'Logo uploaded');
};

exports.deleteBusiness = async (req, res) => {
  await Business.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { isActive: false });
  return successResponse(res, null, 'Business deactivated');
};

exports.getBusinessStats = async (req, res) => {
  const Transaction = require('../models/Transaction');
  const Product = require('../models/Product');
  const Customer = require('../models/Customer');
  const Debt = require('../models/Debt');

  const [totalRevenue, totalExpenses, productCount, customerCount, activeDebts] = await Promise.all([
    Transaction.aggregate([{ $match: { business: req.business._id, type: 'sale' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { business: req.business._id, type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Product.countDocuments({ business: req.business._id, isActive: true }),
    Customer.countDocuments({ business: req.business._id, isActive: true }),
    Debt.aggregate([{ $match: { business: req.business._id, status: { $in: ['active', 'partial'] } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
  ]);

  return successResponse(res, {
    revenue: totalRevenue[0]?.total || 0,
    expenses: totalExpenses[0]?.total || 0,
    profit: (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0),
    products: productCount,
    customers: customerCount,
    activeDebtBalance: activeDebts[0]?.total || 0,
  });
};
