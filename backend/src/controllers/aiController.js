const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const { successResponse } = require('../utils/response');

const toObjectId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

exports.getAIAdvice = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  const [sales, expenses, lowStock, overdueDebts] = await Promise.all([
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', date: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Transaction.aggregate([{ $match: { business: businessId, type: 'expense', date: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Product.countDocuments({ business: businessId, isActive: true, $expr: { $lte: ['$quantity', '$lowStockThreshold'] } }),
    Debt.countDocuments({ business: businessId, status: 'overdue' }),
  ]);

  const revenue = sales[0]?.total || 0;
  const expenseTotal = expenses[0]?.total || 0;
  const profit = revenue - expenseTotal;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

  const recommendations = [];
  const warnings = [];
  const opportunities = [];

  if (lowStock > 0) warnings.push(`⚠️ You have ${lowStock} product(s) with low stock. Restock soon to avoid missing sales.`);
  if (overdueDebts > 0) warnings.push(`⚠️ You have ${overdueDebts} overdue debt(s). Follow up with customers to recover cash.`);
  if (margin < 20) warnings.push(`⚠️ Your profit margin is ${margin}%. Consider reducing expenses or increasing prices.`);

  if (revenue > 0) {
    recommendations.push(`📊 Your revenue this month is ₦${revenue.toLocaleString()}. Aim for 10% growth next month.`);
    recommendations.push(`💡 Record all transactions daily to get a more accurate business health score.`);
  } else {
    recommendations.push(`📝 No sales recorded yet. Start recording your daily sales to track performance.`);
  }

  opportunities.push(`🚀 Businesses that track expenses see 23% higher profitability on average.`);
  opportunities.push(`🤝 Consider joining a market association for collective bargaining and support.`);

  if (sales[0]?.count >= 20) opportunities.push(`⭐ You have consistent sales activity — you may qualify for a business loan. Check your Loan Readiness Score.`);

  return successResponse(res, { recommendations, warnings, opportunities, summary: { revenue, expenses: expenseTotal, profit, margin } });
};

exports.parseVoiceTransaction = async (req, res) => {
  const { transcript, language = 'en' } = req.body;

  // Rule-based NLP parser for common patterns
  const text = transcript.toLowerCase();
  const parsed = { type: 'sale', description: transcript };

  // Extract amount
  const amountMatch = text.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:naira|ngn|₦|k\b)?/);
  if (amountMatch) {
    let amount = parseFloat(amountMatch[1].replace(',', ''));
    if (text.includes(' k') || text.match(/\d+k\b/)) amount *= 1000;
    parsed.amount = amount;
  }

  // Extract quantity and product
  const qtyMatch = text.match(/(\d+)\s+(bags?|pieces?|units?|bottles?|plates?|cups?|kg|litres?|cartons?|jars?|packs?)\s+(?:of\s+)?([a-z\s]+?)(?:\s+for|\s+at|$)/i);
  if (qtyMatch) {
    parsed.products = [{ name: qtyMatch[3].trim(), quantity: parseInt(qtyMatch[1]), unitPrice: parsed.amount / parseInt(qtyMatch[1]), total: parsed.amount }];
  }

  // Determine type based on language
  if (language === 'ha' || language === 'ha-NG') {
    // Hausa keywords
    if (text.match(/\b(da\s+kudin|jiyya|kasua|sayar|gadawa|ba\s+kasuwa)\b/)) {
      parsed.type = text.match(/\b(jiyya|kasua|ba\s+kasuwa)\b/) ? 'expense' : 'sale';
    } else if (text.match(/\b(biya|ba\s+da\s+biya)\b/)) {
      parsed.type = 'sale';
      parsed.paymentStatus = 'pending';
    }
    // Extract customer name Hausa
    const customerMatchHa = text.match(/(?:wa|ga)\s+([a-z]+)/);
    if (customerMatchHa) parsed.customerName = customerMatchHa[1];
  } else {
    // English keywords
    if (text.includes('spent') || text.includes('bought') || text.includes('paid for') || text.includes('expense')) {
      parsed.type = 'expense';
    } else if (text.includes('owe') || text.includes('credit') || text.includes('will pay')) {
      parsed.type = 'sale';
      parsed.paymentStatus = 'pending';
    }
    // Extract customer name English
    const customerMatch = text.match(/(?:sold to|customer|for)\s+([a-z]+)/);
    if (customerMatch) parsed.customerName = customerMatch[1];
  }

  return successResponse(res, { transcript, parsed, language });
};

exports.getLoanReadiness = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [revenue, transactions, debts, customers] = await Promise.all([
    Transaction.aggregate([{ $match: { business: businessId, type: 'sale', date: { $gte: sixMonthsAgo } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Transaction.countDocuments({ business: businessId }),
    Debt.aggregate([{ $match: { business: businessId } }, { $group: { _id: '$status', total: { $sum: '$balance' } } }]),
    Customer.countDocuments({ business: businessId }),
  ]);

  const totalRevenue = revenue[0]?.total || 0;
  const avgMonthlyRevenue = totalRevenue / 6;
  const paidDebt = debts.find(d => d._id === 'paid')?.total || 0;
  const activeDebt = debts.find(d => d._id === 'active')?.total || 0;
  const totalDebt = paidDebt + activeDebt;

  let creditScore = 300;
  if (avgMonthlyRevenue > 50000) creditScore += 100;
  if (avgMonthlyRevenue > 200000) creditScore += 150;
  if (transactions[0] > 100) creditScore += 50;
  if (totalDebt > 0 && paidDebt / totalDebt > 0.7) creditScore += 100;
  if (customers > 20) creditScore += 50;
  creditScore = Math.min(creditScore, 850);

  const loanReadiness = Math.round((creditScore / 850) * 100);

  const factors = [];
  if (avgMonthlyRevenue < 50000) factors.push({ factor: 'Revenue', status: 'low', note: 'Increase monthly sales to above ₦50,000' });
  else factors.push({ factor: 'Revenue', status: 'good', note: `Monthly average: ₦${Math.round(avgMonthlyRevenue).toLocaleString()}` });

  if (transactions > 50) factors.push({ factor: 'Transaction History', status: 'excellent', note: 'Strong record keeping' });
  else factors.push({ factor: 'Transaction History', status: 'fair', note: 'Record more transactions to build history' });

  return successResponse(res, {
    creditScore,
    loanReadinessScore: loanReadiness,
    riskLevel: loanReadiness > 70 ? 'low' : loanReadiness > 40 ? 'medium' : 'high',
    maxLoanEstimate: Math.round(avgMonthlyRevenue * 3),
    factors,
  });
};

exports.getBusinessPassport = async (req, res) => {
  const businessId = toObjectId(req.params.businessId);
  const Business = require('../models/Business');

  const [business, loanData, healthData] = await Promise.all([
    Business.findById(businessId).populate('owner', 'firstName lastName email phone'),
    exports.getLoanReadiness({ params: { businessId: req.params.businessId } }, { json: () => {} }),
    null,
  ]);

  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const monthlyRevenue = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale', date: { $gte: yearAgo } } },
    { $group: { _id: { month: { $month: '$date' }, year: { $year: '$date' } }, total: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return successResponse(res, {
    business,
    monthlyRevenue,
    generatedAt: new Date(),
  });
};
