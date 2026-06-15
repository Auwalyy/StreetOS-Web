const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const toId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

exports.createSale = async (req, res) => {
  const { products, customer, subtotal, discount = 0, total, amountPaid, paymentMethod, paymentStatus, notes } = req.body;

  // 1. Create transaction record
  const transaction = await Transaction.create({
    business: req.params.businessId,
    user: req.user._id,
    type: 'sale',
    amount: total,
    description: notes || `POS Sale — ${products?.length} item(s)`,
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: paymentStatus || 'paid',
    customer: customer || undefined,
    products: products?.map(p => ({
      product: p.product,
      name: p.name,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      total: p.total,
    })),
  });

  // 2. Decrement product stock + record movement
  if (products?.length) {
    for (const item of products) {
      if (!item.product) continue;
      const prod = await Product.findById(item.product);
      if (!prod) continue;
      const before = prod.quantity;
      const after = Math.max(0, before - item.quantity);
      prod.quantity = after;
      prod.totalSold = (prod.totalSold || 0) + item.quantity;
      prod.totalRevenue = (prod.totalRevenue || 0) + (item.total || 0);
      prod.lastSoldAt = new Date();
      prod.stockMovements = prod.stockMovements || [];
      prod.stockMovements.push({
        quantity: -item.quantity,
        type: 'sale',
        reason: `POS Sale — txn ${transaction._id}`,
        quantityBefore: before,
        quantityAfter: after,
        performedBy: req.user._id,
        reference: transaction._id.toString(),
        createdAt: new Date(),
      });
      await prod.save();
    }
  }

  // 3. Update customer stats
  if (customer) {
    await Customer.findByIdAndUpdate(customer, {
      $inc: { totalPurchases: total, totalPaid: amountPaid || 0 },
      lastPurchaseAt: new Date(),
    });
  }

  // Populate for response
  const populated = await Transaction.findById(transaction._id)
    .populate('customer', 'name phone')
    .populate('products.product', 'name');

  return successResponse(res, populated, 'Sale created', 201);
};

exports.getSales = async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const query = { business: req.params.businessId, type: 'sale' };
  if (status) query.paymentStatus = status;
  if (search) query.description = { $regex: search, $options: 'i' };

  const [sales, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('customer', 'name phone'),
    Transaction.countDocuments(query),
  ]);
  return paginatedResponse(res, sales, total, page, limit);
};

exports.getSale = async (req, res) => {
  const sale = await Transaction.findOne({ _id: req.params.id, business: req.params.businessId, type: 'sale' })
    .populate('customer', 'name phone email')
    .populate('products.product', 'name sellingPrice');
  if (!sale) return errorResponse(res, 'Sale not found', 404);
  return successResponse(res, sale);
};

exports.getSalesSummary = async (req, res) => {
  const businessId = toId(req.params.businessId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRevenue, monthRevenue, pending, total] = await Promise.all([
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', createdAt: { $gte: todayStart } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', createdAt: { $gte: monthStart } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', paymentStatus: 'pending' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Transaction.countDocuments({ business: businessId, type: 'sale' }),
  ]);

  return successResponse(res, {
    todayRevenue: todayRevenue[0]?.sum || 0,
    monthRevenue: monthRevenue[0]?.sum || 0,
    pendingAmount: pending[0]?.sum || 0,
    totalCount: total,
  });
};

exports.voidSale = async (req, res) => {
  const sale = await Transaction.findOne({ _id: req.params.id, business: req.params.businessId, type: 'sale' });
  if (!sale) return errorResponse(res, 'Sale not found', 404);
  if (sale.paymentStatus === 'void') return errorResponse(res, 'Already voided', 400);

  // Restore stock
  if (sale.products?.length) {
    for (const item of sale.products) {
      if (!item.product) continue;
      const prod = await Product.findById(item.product);
      if (!prod) continue;
      const before = prod.quantity;
      prod.quantity = before + item.quantity;
      prod.stockMovements = prod.stockMovements || [];
      prod.stockMovements.push({
        quantity: item.quantity,
        type: 'return',
        reason: `Void of sale ${sale._id}`,
        quantityBefore: before,
        quantityAfter: prod.quantity,
        performedBy: req.user._id,
        createdAt: new Date(),
      });
      await prod.save();
    }
  }

  sale.paymentStatus = 'void';
  await sale.save();
  return successResponse(res, sale, 'Sale voided and stock restored');
};
