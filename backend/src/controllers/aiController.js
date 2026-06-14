const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');

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

// ─── Inventory Business Chat ──────────────────────────────────────────────────
exports.inventoryChat = async (req, res) => {
  const { question } = req.body;
  if (!question) return errorResponse(res, 'Question is required', 400);

  const businessId = toObjectId(req.params.businessId);
  const q = question.toLowerCase();

  // ── Stock quantity query ──────────────────────────────────────────────────
  const stockMatch = q.match(/how many (.+?)(?:\s+do i have| left| remaining| in stock)?\??$/);
  if (stockMatch || q.includes('stock') || q.includes('quantity') || q.includes('how many')) {
    const searchTerm = stockMatch ? stockMatch[1].replace(/bags? of |cartons? of |pieces? of /g, '').trim() : null;
    if (searchTerm) {
      const products = await Product.find({
        business: businessId, isActive: true,
        name: { $regex: searchTerm, $options: 'i' },
      }).limit(5);
      if (products.length === 0) return successResponse(res, { answer: `I couldn\'t find any product matching "${searchTerm}" in your inventory. Try a different name.`, type: 'stock' });
      const lines = products.map(p => `**${p.name}**: ${p.quantity} ${p.unit}s ${p.quantity <= p.lowStockThreshold ? '⚠️ (LOW STOCK)' : '✅'}`).join('\n');
      return successResponse(res, { answer: `Here's the stock for "${searchTerm}":\n\n${lines}`, type: 'stock', data: products });
    }
  }

  // ── Best selling product ──────────────────────────────────────────────────
  if (q.includes('best sell') || q.includes('top sell') || q.includes('most sell') || q.includes('fastest')) {
    const thirtyAgo = new Date(Date.now() - 30 * 86400000);
    const top = await Sale.aggregate([
      { $match: { business: businessId, date: { $gte: thirtyAgo } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, totalSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.total' } } },
      { $sort: { totalSold: -1 } }, { $limit: 5 },
    ]);
    if (!top.length) return successResponse(res, { answer: 'No sales recorded in the last 30 days. Start selling to see your best products!', type: 'best_seller' });
    const lines = top.map((p, i) => `${i + 1}. **${p.name}** — ${p.totalSold} units sold · ₦${p.revenue.toLocaleString()} revenue`).join('\n');
    return successResponse(res, { answer: `🏆 Your top selling products (last 30 days):\n\n${lines}`, type: 'best_seller', data: top });
  }

  // ── Restock recommendations ───────────────────────────────────────────────
  if (q.includes('restock') || q.includes('reorder') || q.includes('running out') || q.includes('should i buy')) {
    const lowStock = await Product.find({
      business: businessId, isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
    }).limit(10);
    if (!lowStock.length) return successResponse(res, { answer: '✅ Great news! All your products have sufficient stock. No restocking needed right now.', type: 'restock' });
    const lines = lowStock.map(p => `• **${p.name}**: only ${p.quantity} ${p.unit}s left (threshold: ${p.lowStockThreshold})`).join('\n');
    return successResponse(res, { answer: `⚠️ You need to restock these ${lowStock.length} product(s) urgently:\n\n${lines}`, type: 'restock', data: lowStock });
  }

  // ── Highest profit product ────────────────────────────────────────────────
  if (q.includes('profit') && (q.includes('highest') || q.includes('most') || q.includes('best') || q.includes('which'))) {
    const products = await Product.find({ business: businessId, isActive: true, costPrice: { $gt: 0 } })
      .sort({ sellingPrice: -1 }).limit(20);
    const withProfit = products
      .map(p => ({ name: p.name, profit: p.sellingPrice - p.costPrice, margin: ((p.sellingPrice - p.costPrice) / p.sellingPrice * 100).toFixed(1) }))
      .sort((a, b) => b.profit - a.profit).slice(0, 5);
    if (!withProfit.length) return successResponse(res, { answer: 'Add cost prices to your products so I can calculate profit margins for you.', type: 'profit' });
    const lines = withProfit.map((p, i) => `${i + 1}. **${p.name}** — ₦${p.profit.toLocaleString()} profit per unit (${p.margin}% margin)`).join('\n');
    return successResponse(res, { answer: `📈 Your most profitable products:\n\n${lines}`, type: 'profit', data: withProfit });
  }

  // ── Today's / period sales ────────────────────────────────────────────────
  if (q.includes('today') || q.includes('sales today') || q.includes('how much') || q.includes('revenue')) {
    const period = q.includes('week') ? 7 : q.includes('month') ? 30 : 1;
    const since = new Date(Date.now() - period * 86400000);
    if (period === 1) since.setHours(0, 0, 0, 0);
    const [result] = await Sale.aggregate([
      { $match: { business: businessId, date: { $gte: since } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
    ]);
    const label = period === 1 ? 'today' : period === 7 ? 'this week' : 'this month';
    if (!result) return successResponse(res, { answer: `No sales recorded ${label} yet. Go make some sales! 🚀`, type: 'sales' });
    return successResponse(res, {
      answer: `💰 Sales ${label}:\n\n• **${result.count} transactions**\n• **Revenue: ₦${result.revenue.toLocaleString()}**\n• **Profit: ₦${result.profit.toLocaleString()}**`,
      type: 'sales', data: result,
    });
  }

  // ── Out of stock ──────────────────────────────────────────────────────────
  if (q.includes('out of stock') || q.includes('finished') || q.includes('zero stock')) {
    const outOfStock = await Product.find({ business: businessId, isActive: true, quantity: 0 }).limit(10);
    if (!outOfStock.length) return successResponse(res, { answer: '✅ No products are out of stock right now. Your inventory is healthy!', type: 'out_of_stock' });
    const lines = outOfStock.map(p => `• **${p.name}**`).join('\n');
    return successResponse(res, { answer: `🚫 These ${outOfStock.length} products are out of stock:\n\n${lines}\n\nCreate a purchase order to restock them.`, type: 'out_of_stock', data: outOfStock });
  }

  // ── Total inventory value ─────────────────────────────────────────────────
  if (q.includes('inventory value') || q.includes('stock value') || q.includes('worth') || q.includes('total value')) {
    const products = await Product.find({ business: businessId, isActive: true });
    const costValue = products.reduce((s, p) => s + p.quantity * (p.costPrice || 0), 0);
    const retailValue = products.reduce((s, p) => s + p.quantity * p.sellingPrice, 0);
    return successResponse(res, {
      answer: `📦 Your current inventory:\n\n• **${products.length} products** in stock\n• **Cost value: ₦${costValue.toLocaleString()}**\n• **Retail value: ₦${retailValue.toLocaleString()}**\n• **Potential profit: ₦${(retailValue - costValue).toLocaleString()}**`,
      type: 'inventory_value',
    });
  }

  // ── Dead stock ────────────────────────────────────────────────────────────
  if (q.includes('dead stock') || q.includes('not selling') || q.includes('slow') || q.includes('stale')) {
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const dead = await Product.find({ business: businessId, isActive: true, quantity: { $gt: 0 }, $or: [{ lastSoldAt: { $lt: cutoff } }, { lastSoldAt: null }] }).limit(8);
    if (!dead.length) return successResponse(res, { answer: '🚀 All your products are actively selling! No dead stock detected.', type: 'dead_stock' });
    const lines = dead.map(p => `• **${p.name}** — ${p.quantity} units · last sold: ${p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString() : 'never'}`).join('\n');
    return successResponse(res, { answer: `💤 Products that haven\'t sold in 30+ days:\n\n${lines}\n\n💡 Consider running a discount or bundle promotion.`, type: 'dead_stock', data: dead });
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return successResponse(res, {
    answer: `I\'m not sure how to answer that yet. Try asking me:\n\n• "How many bags of rice do I have?"\n• "What is my best selling product?"\n• "Which products should I restock?"\n• "Which product generates the highest profit?"\n• "What are my sales today?"\n• "What is my inventory value?"\n• "Which products are out of stock?"`,
    type: 'fallback',
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
