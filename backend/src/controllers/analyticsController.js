const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Debt = require('../models/Debt');
const { successResponse } = require('../utils/response');

const toObjectId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

exports.getDashboardStats = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [revenue, expenses, prevRevenue, customerCount, lowStock, activeDebts] = await Promise.all([
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { business: businessId, type: 'expense', date: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', date: { $gte: prevMonthStart, $lt: monthStart } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Customer.countDocuments({ business: businessId, isActive: true }),
    Product.countDocuments({ business: businessId, isActive: true, $expr: { $lte: ['$quantity', '$lowStockThreshold'] } }),
    Debt.aggregate([{ $match: { business: businessId, status: { $in: ['active', 'partial'] } } }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
  ]);

  const thisRevenue = revenue[0]?.total || 0;
  const lastRevenue = prevRevenue[0]?.total || 0;
  const revenueGrowth = lastRevenue > 0 ? (((thisRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1) : 0;

  return successResponse(res, {
    revenue: thisRevenue,
    expenses: expenses[0]?.total || 0,
    profit: thisRevenue - (expenses[0]?.total || 0),
    revenueGrowth,
    customers: customerCount,
    lowStockCount: lowStock,
    activeDebtBalance: activeDebts[0]?.total || 0,
  });
};

exports.getRevenueChart = async (req, res) => {
  const { period = 'monthly' } = req.query;
  const businessId = toObjectId(req.params.businessId);

  let groupBy, dateFilter;
  const now = new Date();

  if (period === 'daily') {
    dateFilter = new Date(now.setDate(now.getDate() - 30));
    groupBy = { day: { $dayOfMonth: '$date' }, month: { $month: '$date' } };
  } else if (period === 'weekly') {
    dateFilter = new Date(now.setDate(now.getDate() - 90));
    groupBy = { week: { $week: '$date' }, year: { $year: '$date' } };
  } else if (period === 'yearly') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 5));
    groupBy = { year: { $year: '$date' } };
  } else {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
    groupBy = { month: { $month: '$date' }, year: { $year: '$date' } };
  }

  const data = await Transaction.aggregate([
    { $match: { business: businessId, type: { $in: ['sale', 'expense'] }, date: { $gte: dateFilter } } },
    { $group: { _id: { ...groupBy, type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return successResponse(res, data);
};

exports.getTopProducts = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const data = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale' } },
    { $unwind: '$products' },
    { $group: { _id: '$products.name', totalSold: { $sum: '$products.quantity' }, totalRevenue: { $sum: '$products.total' } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 },
  ]);
  return successResponse(res, data);
};

exports.getBusinessHealthScore = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  const [sales, debts, customers] = await Promise.all([
    Transaction.aggregate([
      { $match: { business: businessId, type: 'sale', date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Debt.aggregate([
      { $match: { business: businessId } },
      { $group: { _id: '$status', total: { $sum: '$balance' }, count: { $sum: 1 } } },
    ]),
    Customer.countDocuments({ business: businessId }),
  ]);

  const revenue = sales[0]?.total || 0;
  const salesCount = sales[0]?.count || 0;
  const paidDebts = debts.find(d => d._id === 'paid')?.count || 0;
  const totalDebts = debts.reduce((a, b) => a + b.count, 0);

  const revenueScore = Math.min((revenue / 100000) * 25, 25);
  const salesConsistencyScore = Math.min((salesCount / 30) * 20, 20);
  const debtScore = totalDebts > 0 ? (paidDebts / totalDebts) * 25 : 25;
  const customerScore = Math.min((customers / 50) * 15, 15);
  const baseScore = 15;

  const totalScore = Math.round(revenueScore + salesConsistencyScore + debtScore + customerScore + baseScore);

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (revenueScore > 15) strengths.push('Strong revenue generation');
  else weaknesses.push('Revenue needs improvement');

  if (debtScore > 15) strengths.push('Good debt management');
  else { weaknesses.push('High debt ratio'); recommendations.push('Focus on collecting outstanding debts'); }

  if (salesConsistencyScore > 12) strengths.push('Consistent sales activity');
  else { weaknesses.push('Inconsistent sales'); recommendations.push('Record all daily sales to improve tracking'); }

  recommendations.push('Set weekly revenue goals', 'Review expenses monthly');

  return successResponse(res, { score: totalScore, strengths, weaknesses, recommendations });
};
