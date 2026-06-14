const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const InventoryMovement = require('../models/InventoryMovement');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ─── Checkout / Create Sale ───────────────────────────────────────────────────

exports.createSale = async (req, res) => {
  const { items, customerId, customerName, paymentMethod, paymentStatus, amountPaid, discount = 0, tax = 0, notes, priceType = 'retail', isVoiceEntry, voiceTranscript } = req.body;

  if (!items?.length) return errorResponse(res, 'Sale must have at least one item', 400);

  // Enrich items with product data & validate stock
  const enrichedItems = [];
  for (const item of items) {
    const product = await Product.findOne({ _id: item.product, business: req.params.businessId, isActive: true });
    if (!product) return errorResponse(res, `Product not found: ${item.name || item.product}`, 404);
    if (product.quantity < item.quantity) return errorResponse(res, `Insufficient stock for ${product.name}. Available: ${product.quantity}`, 400);

    const unitPrice = priceType === 'wholesale' && product.wholesalePrice > 0
      ? product.wholesalePrice
      : priceType === 'special' && item.unitPrice
        ? item.unitPrice
        : product.sellingPrice;

    const total = unitPrice * item.quantity;
    const profit = (unitPrice - product.costPrice) * item.quantity;
    enrichedItems.push({ product: product._id, name: product.name, sku: product.sku, quantity: item.quantity, unitPrice, costPrice: product.costPrice, discount: item.discount || 0, total, profit });
  }

  const subtotal = enrichedItems.reduce((s, i) => s + i.total, 0);
  const discountAmt = discount > 1 ? discount : subtotal * (discount / 100);
  const taxAmt = tax > 1 ? tax : subtotal * (tax / 100);
  const total = subtotal - discountAmt + taxAmt;
  const totalProfit = enrichedItems.reduce((s, i) => s + i.profit, 0);
  const totalCost = enrichedItems.reduce((s, i) => s + i.costPrice * i.quantity, 0);

  const sale = await Sale.create({
    business: req.params.businessId,
    soldBy: req.user._id,
    customer: customerId || null,
    customerName: customerName || 'Walk-in Customer',
    items: enrichedItems,
    subtotal,
    discount: discountAmt,
    tax: taxAmt,
    total,
    totalProfit,
    totalCost,
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: paymentStatus || 'paid',
    amountPaid: amountPaid || total,
    change: amountPaid ? Math.max(0, amountPaid - total) : 0,
    notes,
    priceType,
    isVoiceEntry,
    voiceTranscript,
  });

  // Deduct stock & record movements
  for (const item of enrichedItems) {
    const product = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { quantity: -item.quantity, totalSold: item.quantity, totalRevenue: item.total }, $set: { lastSoldAt: new Date() } },
      { new: true }
    );
    await InventoryMovement.create({
      business: req.params.businessId,
      product: item.product,
      type: 'sale',
      quantity: -item.quantity,
      quantityBefore: product.quantity + item.quantity,
      quantityAfter: product.quantity,
      reference: sale._id.toString(),
      performedBy: req.user._id,
    });
  }

  // Update customer stats
  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalPurchases: total, loyaltyPoints: Math.floor(total / 100) },
      $set: { lastPurchaseDate: new Date() },
    });
  }

  const populated = await Sale.findById(sale._id).populate('customer', 'name phone').populate('soldBy', 'name');
  return successResponse(res, populated, 'Sale completed', 201);
};

// ─── Get Sales ────────────────────────────────────────────────────────────────

exports.getSales = async (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, customerId, soldBy, paymentMethod } = req.query;
  const query = { business: req.params.businessId };
  if (customerId) query.customer = customerId;
  if (soldBy) query.soldBy = soldBy;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  const [sales, total] = await Promise.all([
    Sale.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit))
      .populate('customer', 'name phone').populate('soldBy', 'name'),
    Sale.countDocuments(query),
  ]);
  return paginatedResponse(res, sales, total, page, limit);
};

exports.getSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, business: req.params.businessId })
    .populate('customer', 'name phone email address')
    .populate('soldBy', 'name');
  if (!sale) return errorResponse(res, 'Sale not found', 404);
  return successResponse(res, sale);
};

exports.voidSale = async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!sale) return errorResponse(res, 'Sale not found', 404);

  // Restore stock
  for (const item of sale.items) {
    if (item.product) {
      const product = await Product.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity, totalSold: -item.quantity } }, { new: true });
      await InventoryMovement.create({
        business: req.params.businessId,
        product: item.product,
        type: 'return',
        quantity: item.quantity,
        quantityBefore: product.quantity - item.quantity,
        quantityAfter: product.quantity,
        reference: sale._id.toString(),
        performedBy: req.user._id,
        reason: 'Sale voided',
      });
    }
  }

  await Sale.findByIdAndDelete(sale._id);
  return successResponse(res, null, 'Sale voided and stock restored');
};

// ─── Sales Summary / Reports ──────────────────────────────────────────────────

exports.getSalesSummary = async (req, res) => {
  const mongoose = require('mongoose');
  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);
  const { period = 'today' } = req.query;

  const now = new Date();
  let startDate;
  if (period === 'today') startDate = new Date(now.setHours(0, 0, 0, 0));
  else if (period === 'week') startDate = new Date(Date.now() - 7 * 86400000);
  else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
  else startDate = new Date(req.query.startDate || Date.now() - 30 * 86400000);

  const [summary] = await Sale.aggregate([
    { $match: { business: businessId, date: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        totalProfit: { $sum: '$totalProfit' },
        totalCost: { $sum: '$totalCost' },
        avgOrderValue: { $avg: '$total' },
      }
    }
  ]);

  const dailyBreakdown = await Sale.aggregate([
    { $match: { business: businessId, date: { $gte: startDate } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, revenue: { $sum: '$total' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const staffPerformance = await Sale.aggregate([
    { $match: { business: businessId, date: { $gte: startDate } } },
    { $group: { _id: '$soldBy', totalSales: { $sum: 1 }, totalRevenue: { $sum: '$total' }, totalProfit: { $sum: '$totalProfit' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$user.name', totalSales: 1, totalRevenue: 1, totalProfit: 1 } },
    { $sort: { totalRevenue: -1 } },
  ]);

  return successResponse(res, { summary: summary || {}, dailyBreakdown, staffPerformance });
};

// ─── Voice Sale Entry ─────────────────────────────────────────────────────────

exports.parseVoiceSale = async (req, res) => {
  const { transcript } = req.body;
  // Simple NLP parsing — detect product names in inventory
  const products = await Product.find({ business: req.params.businessId, isActive: true });

  const lower = transcript.toLowerCase();
  const detected = [];

  for (const product of products) {
    const nameWords = product.name.toLowerCase().split(' ');
    if (nameWords.some(word => word.length > 2 && lower.includes(word))) {
      // Try to extract quantity
      const qtyMatch = lower.match(/(\d+)\s*(bag|piece|unit|kg|pack|carton|bottle|tin|roll|yard|metre|meter)?s?\s+(?:of\s+)?/);
      detected.push({
        product: product._id,
        name: product.name,
        quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        total: product.sellingPrice * (qtyMatch ? parseInt(qtyMatch[1]) : 1),
      });
      break; // take first match for simplicity
    }
  }

  // Detect customer name: "to [Name]"
  const customerMatch = lower.match(/(?:to|for)\s+([a-z]+(?:\s+[a-z]+)?)/);
  const customerName = customerMatch ? customerMatch[1].replace(/\b\w/g, c => c.toUpperCase()) : null;

  return successResponse(res, { transcript, detectedItems: detected, detectedCustomer: customerName });
};
