const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const toId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

// ─── CRUD ──────────────────────────────────────────────────────────────────────
exports.createProduct = async (req, res) => {
  const product = await Product.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, product, 'Product created', 201);
};

exports.getProducts = async (req, res) => {
  const { page = 1, limit = 50, search, category, lowStock, archived } = req.query;
  const query = { business: req.params.businessId };

  if (archived === 'true') query.isArchived = true;
  else query.isArchived = { $ne: true };

  if (category) query.category = category;
  if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }

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

exports.getProductByBarcode = async (req, res) => {
  const product = await Product.findOne({ barcode: req.params.code, business: req.params.businessId, isArchived: { $ne: true } });
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product);
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product updated');
};

exports.archiveProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    { isArchived: true },
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product archived');
};

exports.restoreProduct = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    { isArchived: false },
    { new: true }
  );
  if (!product) return errorResponse(res, 'Product not found', 404);
  return successResponse(res, product, 'Product restored');
};

// ─── STOCK ADJUSTMENT (with movement log) ─────────────────────────────────────
exports.adjustStock = async (req, res) => {
  const { quantity, reason, type = 'adjustment' } = req.body;
  const product = await Product.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!product) return errorResponse(res, 'Product not found', 404);

  const before = product.quantity;
  product.quantity = Math.max(0, product.quantity + Number(quantity));
  product.stockMovements = product.stockMovements || [];
  product.stockMovements.push({
    quantity: Number(quantity),
    type,
    reason: reason || 'Manual adjustment',
    quantityBefore: before,
    quantityAfter: product.quantity,
    performedBy: req.user._id,
    createdAt: new Date(),
  });
  await product.save();
  return successResponse(res, product, 'Stock adjusted');
};

// ─── LOW STOCK ────────────────────────────────────────────────────────────────
exports.getLowStockProducts = async (req, res) => {
  const products = await Product.find({
    business: req.params.businessId,
    isArchived: { $ne: true },
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
  });
  return successResponse(res, products);
};

// ─── MOVEMENTS ────────────────────────────────────────────────────────────────
exports.getMovements = async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const products = await Product.find({ business: req.params.businessId })
    .select('name stockMovements unit')
    .lean();

  // Flatten all movements from all products
  let allMovements = [];
  for (const p of products) {
    for (const m of (p.stockMovements || [])) {
      allMovements.push({ ...m, product: { _id: p._id, name: p.name, unit: p.unit } });
    }
  }

  // Sort by date desc
  allMovements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = allMovements.length;
  const start = (page - 1) * limit;
  const paginated = allMovements.slice(start, start + Number(limit));

  return paginatedResponse(res, paginated, total, page, limit);
};

// ─── LEAKAGE DETECTION ────────────────────────────────────────────────────────
exports.detectLeakage = async (req, res) => {
  const businessId = toId(req.params.businessId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all products
  const products = await Product.find({ business: req.params.businessId, isArchived: { $ne: true } }).lean();

  // Get total sold per product from transactions
  const soldData = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale', date: { $gte: thirtyDaysAgo } } },
    { $unwind: '$products' },
    { $group: { _id: '$products.product', totalSold: { $sum: '$products.quantity' } } },
  ]);
  const soldMap = {};
  soldData.forEach(s => { if (s._id) soldMap[s._id.toString()] = s.totalSold; });

  // Get stock-in from movements
  const leakage = [];
  for (const p of products) {
    const stockInTotal = (p.stockMovements || [])
      .filter(m => m.type === 'stock_in')
      .reduce((a, b) => a + Math.abs(b.quantity), 0);

    const totalSold = soldMap[p._id.toString()] || 0;
    // initialStock + stockIn - sold = expected
    const initialStock = (p.stockMovements?.[0]?.quantityBefore) || 0;
    const expected = initialStock + stockInTotal - totalSold;
    const actual = p.quantity;
    const difference = expected - actual;

    if (difference > 2) {
      const estimatedLoss = difference * (p.costPrice || p.sellingPrice || 0);
      leakage.push({
        _id: p._id,
        name: p.name,
        expected: Math.round(expected),
        actual,
        difference: Math.round(difference),
        estimatedLoss,
        riskLevel: difference > 20 ? 'HIGH' : difference > 5 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  leakage.sort((a, b) => b.estimatedLoss - a.estimatedLoss);
  return successResponse(res, leakage);
};

// ─── DEMAND FORECAST ──────────────────────────────────────────────────────────
exports.getForecast = async (req, res) => {
  const businessId = toId(req.params.businessId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Sales velocity per product (last 30 days)
  const soldData = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale', date: { $gte: thirtyDaysAgo } } },
    { $unwind: '$products' },
    { $group: { _id: '$products.product', totalSold: { $sum: '$products.quantity' } } },
  ]);

  const products = await Product.find({ business: req.params.businessId, isArchived: { $ne: true } }).lean();
  const productMap = {};
  products.forEach(p => { productMap[p._id.toString()] = p; });

  const forecast = [];
  for (const s of soldData) {
    if (!s._id) continue;
    const product = productMap[s._id.toString()];
    if (!product) continue;

    const dailyVelocity = s.totalSold / 30;
    if (dailyVelocity === 0) continue;

    const daysRemaining = product.quantity / dailyVelocity;
    if (daysRemaining < 14) {
      forecast.push({
        _id: product._id,
        name: product.name,
        currentStock: product.quantity,
        dailyVelocity,
        daysRemaining,
        suggestedReorderQty: Math.ceil(dailyVelocity * 30),
      });
    }
  }

  forecast.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return successResponse(res, forecast);
};

// ─── DEAD STOCK ───────────────────────────────────────────────────────────────
exports.getDeadStock = async (req, res) => {
  const { days = 30 } = req.query;
  const businessId = toId(req.params.businessId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  // Products with stock > 0
  const products = await Product.find({
    business: req.params.businessId,
    isArchived: { $ne: true },
    quantity: { $gt: 0 },
  }).lean();

  // Last sale date per product
  const lastSales = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale' } },
    { $unwind: '$products' },
    { $group: { _id: '$products.product', lastSoldAt: { $max: '$date' } } },
  ]);
  const lastSaleMap = {};
  lastSales.forEach(s => { if (s._id) lastSaleMap[s._id.toString()] = s.lastSoldAt; });

  const deadStock = [];
  for (const p of products) {
    const lastSoldAt = lastSaleMap[p._id.toString()];
    const isDeadStock = !lastSoldAt || new Date(lastSoldAt) < cutoff;
    if (isDeadStock) {
      const staleDays = lastSoldAt
        ? Math.floor((Date.now() - new Date(lastSoldAt)) / (1000 * 60 * 60 * 24))
        : null;
      deadStock.push({
        _id: p._id,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        stockValue: p.quantity * (p.costPrice || p.sellingPrice),
        lastSoldAt,
        staleDays,
        recommendation: !lastSoldAt ? 'Never sold — consider removing or discounting' :
          staleDays > 90 ? 'Bundle with popular items' :
          staleDays > 60 ? 'Apply 20% discount to move stock' :
          'Monitor — slow moving product',
      });
    }
  }

  deadStock.sort((a, b) => (b.staleDays || 9999) - (a.staleDays || 9999));
  return successResponse(res, deadStock);
};

// ─── INVENTORY REPORT ─────────────────────────────────────────────────────────
exports.getReport = async (req, res) => {
  const products = await Product.find({
    business: req.params.businessId,
    isArchived: { $ne: true },
  }).lean();

  const totalProducts = products.length;
  const totalStockValue = products.reduce((a, p) => a + (p.quantity * (p.costPrice || 0)), 0);
  const totalRetailValue = products.reduce((a, p) => a + (p.quantity * p.sellingPrice), 0);
  const potentialProfit = totalRetailValue - totalStockValue;

  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
  const outOfStockProducts = products.filter(p => p.quantity === 0);

  return successResponse(res, {
    totalProducts,
    totalStockValue,
    totalRetailValue,
    potentialProfit,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 10),
    outOfStockProducts: outOfStockProducts.slice(0, 10),
  });
};
