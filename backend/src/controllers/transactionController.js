const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createTransaction = async (req, res) => {
  const transaction = await Transaction.create({ ...req.body, business: req.params.businessId, user: req.user._id });

  // Decrement product stock and record movement on sale
  if (transaction.type === 'sale' && transaction.products?.length) {
    for (const item of transaction.products) {
      if (!item.product) continue;
      const product = await Product.findById(item.product);
      if (!product) continue;
      const before = product.quantity;
      const after = Math.max(0, before - item.quantity);
      product.quantity = after;
      product.totalSold = (product.totalSold || 0) + item.quantity;
      product.totalRevenue = (product.totalRevenue || 0) + (item.total || 0);
      product.lastSoldAt = transaction.date || new Date();
      product.stockMovements = product.stockMovements || [];
      product.stockMovements.push({
        quantity: -item.quantity,
        type: 'sale',
        reason: `Sale — ${transaction._id}`,
        quantityBefore: before,
        quantityAfter: after,
        performedBy: req.user._id,
        reference: transaction._id.toString(),
        createdAt: new Date(),
      });
      await product.save();
    }
  }

  return successResponse(res, transaction, 'Transaction created', 201);
};

exports.getTransactions = async (req, res) => {
  const { page = 1, limit = 20, type, startDate, endDate, search, category } = req.query;
  const query = { business: req.params.businessId };

  if (type) query.type = type;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (search) query.description = { $regex: search, $options: 'i' };

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('customer', 'name phone')
      .populate('products.product', 'name'),
    Transaction.countDocuments(query),
  ]);

  return paginatedResponse(res, transactions, total, page, limit);
};

exports.getTransaction = async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, business: req.params.businessId })
    .populate('customer', 'name phone email')
    .populate('products.product', 'name sellingPrice');
  if (!transaction) return errorResponse(res, 'Transaction not found', 404);
  return successResponse(res, transaction);
};

exports.updateTransaction = async (req, res) => {
  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true }
  );
  if (!transaction) return errorResponse(res, 'Transaction not found', 404);
  return successResponse(res, transaction, 'Transaction updated');
};

exports.deleteTransaction = async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, business: req.params.businessId });
  if (!transaction) return errorResponse(res, 'Transaction not found', 404);
  return successResponse(res, null, 'Transaction deleted');
};

exports.getTransactionSummary = async (req, res) => {
  const { period = 'month' } = req.query;
  const businessId = req.params.businessId;

  const now = new Date();
  let startDate;
  if (period === 'day') startDate = new Date(now.setHours(0, 0, 0, 0));
  else if (period === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
  else if (period === 'month') startDate = new Date(now.setDate(1));
  else startDate = new Date(now.setMonth(0, 1));

  const summary = await Transaction.aggregate([
    { $match: { business: require('mongoose').Types.ObjectId.createFromHexString(businessId), date: { $gte: startDate } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  return successResponse(res, summary);
};

exports.createVoiceTransaction = async (req, res) => {
  const { transcript, parsedData } = req.body;
  const transaction = await Transaction.create({
    ...parsedData,
    business: req.params.businessId,
    user: req.user._id,
    isVoiceEntry: true,
    voiceTranscript: transcript,
  });
  return successResponse(res, transaction, 'Voice transaction created', 201);
};
