const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt');
const Business = require('../models/Business');
const mongoose = require('mongoose');
const { successResponse } = require('../utils/response');

const toObjectId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

exports.runFraudDetection = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const flags = [];

  // 1. Detect unusually large transactions
  const avgResult = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale', date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, avg: { $avg: '$amount' }, stddev: { $stdDevPop: '$amount' } } },
  ]);

  if (avgResult[0]) {
    const { avg, stddev } = avgResult[0];
    const threshold = avg + 3 * stddev;
    const suspicious = await Transaction.find({ business: businessId, type: 'sale', amount: { $gt: threshold }, date: { $gte: thirtyDaysAgo } }).sort({ amount: -1 }).limit(5);
    if (suspicious.length > 0) {
      flags.push({ type: 'unusual_transaction', severity: 'medium', count: suspicious.length, message: `${suspicious.length} transaction(s) are unusually large (above ₦${Math.round(threshold).toLocaleString()})`, items: suspicious.map(t => ({ _id: t._id, amount: t.amount, date: t.date, description: t.description })) });
    }
  }

  // 2. Detect duplicate transactions (same amount, same day)
  const duplicates = await Transaction.aggregate([
    { $match: { business: businessId, date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { amount: '$amount', type: '$type', day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 3 } } },
  ]);
  if (duplicates.length > 0) {
    flags.push({ type: 'duplicate_transactions', severity: 'low', count: duplicates.length, message: `${duplicates.length} group(s) of possibly duplicate transactions detected` });
  }

  // 3. Inventory leakage (products with negative/zero stock but sales recorded)
  const Product = require('../models/Product');
  const zeroStockWithSales = await Product.countDocuments({ business: businessId, quantity: 0, isActive: true });
  if (zeroStockWithSales > 0) {
    flags.push({ type: 'inventory_leakage', severity: 'medium', count: zeroStockWithSales, message: `${zeroStockWithSales} product(s) have zero stock - possible unrecorded inventory or sales` });
  }

  // 4. Suspicious debt behaviour (many overdue debts from same customer)
  const overdueDebts = await Debt.aggregate([
    { $match: { business: businessId, status: 'overdue' } },
    { $group: { _id: '$customer', count: { $sum: 1 }, totalOwed: { $sum: '$balance' } } },
    { $match: { count: { $gte: 3 } } },
    { $sort: { count: -1 } },
  ]);
  if (overdueDebts.length > 0) {
    flags.push({ type: 'suspicious_debt', severity: 'high', count: overdueDebts.length, message: `${overdueDebts.length} customer(s) have 3+ overdue debts - potential bad debtors` });
  }

  const riskScore = flags.reduce((acc, f) => {
    return acc + (f.severity === 'high' ? 30 : f.severity === 'medium' ? 15 : 5);
  }, 0);

  return successResponse(res, { flags, riskScore: Math.min(riskScore, 100), flagCount: flags.length, riskLevel: riskScore > 50 ? 'high' : riskScore > 20 ? 'medium' : 'low', analyzedAt: new Date() });
};

exports.verifyBusiness = async (req, res) => {
  const { level, documents } = req.body;
  const business = await Business.findOneAndUpdate(
    { _id: req.params.businessId, owner: req.user._id },
    { verificationLevel: level, isVerified: level >= 1, verificationBadge: level >= 3 ? 'gold' : level === 2 ? 'silver' : level === 1 ? 'bronze' : 'none' },
    { new: true }
  );
  return successResponse(res, business, 'Verification status updated');
};

exports.getVerificationStatus = async (req, res) => {
  const business = await Business.findById(req.params.businessId).select('isVerified verificationLevel verificationBadge name');
  const levels = [
    { level: 0, name: 'Unverified', description: 'No verification', badge: 'none', requirements: ['Create account', 'Add business'] },
    { level: 1, name: 'Bronze', description: 'Basic verification', badge: 'bronze', requirements: ['Email verified', 'Phone number added', 'Business profile complete'] },
    { level: 2, name: 'Silver', description: 'Identity verified', badge: 'silver', requirements: ['NIN or BVN submitted', 'Business address verified', '30 days of transactions'] },
    { level: 3, name: 'Gold', description: 'Fully verified', badge: 'gold', requirements: ['CAC registration', '6 months transaction history', 'Two references verified'] },
  ];
  return successResponse(res, { business, levels, currentLevel: business?.verificationLevel || 0 });
};
