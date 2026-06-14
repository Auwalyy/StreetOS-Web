const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const Sale = require('../models/Sale');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ─── Product CRUD ─────────────────────────────────────────────────────────────

exports.createProduct = async (req, res) => {
  const product = await Product.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, product, 'Product created', 201);
};

exports.getProducts = async (req, res) => {
  const { page = 1, limit = 20, search, category, lowStock, archived = 'false' } = req.query;
  const query = { business: req.params.businessId, isArchived: archived === 'true' };
  if (archived === 'false') query.isActive = true;
  if (category) query.category = category;
  if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }
  const [products, total] = await Promise.all([
    Product.find(query).populate('supplier', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Product.countDocuments(query),
  ]);
  return paginatedResponse(res, products, total, page, limit);
};

exports.getProduct = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, business: req.params.businessId }).populate('supplier', 'name phone');
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

exports.archiveProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    { isArchived: true, isActive: false },
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product archived');
};

exports.restoreProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    { isArchived: false, isActive: true },
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product restored');
};

exports.getLowStockProducts = async (req, res) => {
  const products = await Product.find({
    business: req.params.businessId,
    isActive: true,
    isArchived: false,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
  });
  return successResponse(res, products);
};

// ─── Barcode / QR lookup ──────────────────────────────────────────────────────

exports.getProductByBarcode = async (req, res) => {
  const product = await Product.findOne({ business: req.params.businessId, barcode: req.params.code, isActive: true });
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product);
};

// ─── Stock Adjustment ─────────────────────────────────────────────────────────

exports.adjustStock = async (req, res) => {
  const { quantity, reason, type = 'adjustment' } = req.body;
  const product = await Product.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!product) return errorResponse(res, 'Product not found', 404);

  const before = product.quantity;
  product.quantity = Math.max(0, product.quantity + quantity);
  await product.save();

  await InventoryMovement.create({
    business: req.params.businessId,
    product: product._id,
    type,
    quantity,
    quantityBefore: before,
    quantityAfter: product.quantity,
    reason,
    performedBy: req.user._id,
  });

  return successResponse(res, product, 'Stock adjusted');
};

// ─── Inventory Movements ─────────────────────────────────────────────────────

exports.getMovements = async (req, res) => {
  const { page = 1, limit = 30, productId, type, startDate, endDate } = req.query;
  const query = { business: req.params.businessId };
  if (productId) query.product = productId;
  if (type) query.type = type;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const [movements, total] = await Promise.all([
    InventoryMovement.find(query)
      .populate('product', 'name unit')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    InventoryMovement.countDocuments(query),
  ]);
  return paginatedResponse(res, movements, total, page, limit);
};

// ─── AI: Leakage Detection ────────────────────────────────────────────────────

exports.detectLeakage = async (req, res) => {
  const mongoose = require('mongoose');
  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);

  // For each product: expected = initial + stock_in - sales - damages
  const pipeline = [
    { $match: { business: businessId } },
    {
      $group: {
        _id: '$product',
        stockIn: { $sum: { $cond: [{ $in: ['$type', ['stock_in', 'adjustment']] }, { $cond: [{ $gt: ['$quantity', 0] }, '$quantity', 0] }, 0] } },
        stockOut: { $sum: { $cond: [{ $in: ['$type', ['sale', 'damage', 'transfer', 'stock_out']] }, { $abs: '$quantity' }, 0] } },
      }
    },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        expected: { $subtract: ['$stockIn', '$stockOut'] },
        actual: '$product.quantity',
        costPrice: '$product.costPrice',
      }
    },
    {
      $addFields: {
        difference: { $subtract: ['$expected', '$actual'] },
      }
    },
    { $match: { difference: { $gt: 2 } } },
    {
      $project: {
        name: 1, expected: 1, actual: 1, difference: 1,
        estimatedLoss: { $multiply: ['$difference', '$costPrice'] },
        riskLevel: {
          $switch: {
            branches: [
              { case: { $gte: ['$difference', 20] }, then: 'HIGH' },
              { case: { $gte: ['$difference', 10] }, then: 'MEDIUM' },
            ],
            default: 'LOW',
          }
        }
      }
    },
  ];

  const leakages = await InventoryMovement.aggregate(pipeline);
  return successResponse(res, leakages);
};

// ─── AI: Restock Forecast ─────────────────────────────────────────────────────

exports.getRestockForecast = async (req, res) => {
  const mongoose = require('mongoose');
  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const salesVelocity = await Sale.aggregate([
    { $match: { business: businessId, date: { $gte: thirtyDaysAgo } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.quantity' },
        name: { $first: '$items.name' },
      }
    },
    { $addFields: { dailyVelocity: { $divide: ['$totalSold', 30] } } },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1, totalSold: 1, dailyVelocity: 1,
        currentStock: '$product.quantity',
        daysRemaining: {
          $cond: [
            { $gt: ['$dailyVelocity', 0] },
            { $divide: ['$product.quantity', '$dailyVelocity'] },
            999,
          ]
        }
      }
    },
    { $match: { daysRemaining: { $lt: 14 } } },
    { $sort: { daysRemaining: 1 } },
  ]);

  return successResponse(res, salesVelocity);
};

// ─── AI: Dead Stock Detection ─────────────────────────────────────────────────

exports.getDeadStock = async (req, res) => {
  const { days = 30 } = req.query;
  const cutoff = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

  const products = await Product.find({
    business: req.params.businessId,
    isActive: true,
    isArchived: false,
    quantity: { $gt: 0 },
    $or: [{ lastSoldAt: { $lt: cutoff } }, { lastSoldAt: null }],
  }).select('name category quantity costPrice sellingPrice lastSoldAt');

  const result = products.map(p => ({
    ...p.toObject(),
    staleDays: p.lastSoldAt ? Math.floor((Date.now() - p.lastSoldAt) / 86400000) : null,
    stockValue: p.quantity * p.costPrice,
    recommendation: p.quantity > 20 ? 'Offer discount bundle' : 'Run promotion',
  }));

  return successResponse(res, result);
};

// ─── Product Performance ──────────────────────────────────────────────────────

exports.getProductPerformance = async (req, res) => {
  const mongoose = require('mongoose');
  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);
  const { period = 30 } = req.query;
  const since = new Date(Date.now() - Number(period) * 86400000);

  const performance = await Sale.aggregate([
    { $match: { business: businessId, date: { $gte: since } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        totalSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.total' },
        profit: { $sum: '$items.profit' },
      }
    },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'p' } },
    { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1, totalSold: 1, revenue: 1, profit: 1,
        stockRemaining: '$p.quantity',
        category: '$p.category',
      }
    },
    { $sort: { revenue: -1 } },
  ]);

  return successResponse(res, performance);
};

// ─── Inventory Report ─────────────────────────────────────────────────────────

exports.getInventoryReport = async (req, res) => {
  const products = await Product.find({ business: req.params.businessId, isActive: true, isArchived: false });
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
  const totalRetailValue = products.reduce((sum, p) => sum + p.quantity * p.sellingPrice, 0);
  const lowStock = products.filter(p => p.quantity <= p.lowStockThreshold);
  const outOfStock = products.filter(p => p.quantity === 0);

  return successResponse(res, {
    totalProducts,
    totalStockValue,
    totalRetailValue,
    potentialProfit: totalRetailValue - totalStockValue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockProducts: lowStock,
    outOfStockProducts: outOfStock,
  });
};
