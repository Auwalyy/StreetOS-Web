const Product = require('../models/Product');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createProduct = async (req, res) => {
  const product = await Product.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, product, 'Product created', 201);
};

exports.getProducts = async (req, res) => {
  const { page = 1, limit = 20, search, category, lowStock } = req.query;
  const query = { business: req.params.businessId, isActive: true };
  if (category) query.category = category;
  if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }];

  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Product.countDocuments(query),
  ]);
  return paginatedResponse(res, products, total, page, limit);
};

exports.getProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product);
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product updated');
};

exports.deleteProduct = async (req, res) => {
  await Product.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, { isActive: false });
  return successResponse(res, null, 'Product deleted');
};

exports.adjustStock = async (req, res) => {
  const { quantity, reason } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    { $inc: { quantity } },
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Stock adjusted');
};

exports.getLowStockProducts = async (req, res) => {
  const products = await Product.find({
    business: req.params.businessId,
    isActive: true,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
  });
  return successResponse(res, products);
};
