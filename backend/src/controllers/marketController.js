const MarketPrice = require('../models/MarketPrice');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/response');

// Seed default market prices if empty
const seedMarketData = async () => {
  const count = await MarketPrice.countDocuments();
  if (count > 0) return;
  const items = [
    { product: 'Rice (50kg bag)', category: 'grains', unit: 'bag', currentPrice: 85000, trend: 'rising', trendPercentage: 12, demand: 'high', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Garri (bag)', category: 'grains', unit: 'bag', currentPrice: 25000, trend: 'stable', trendPercentage: 2, demand: 'high', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Tomatoes (basket)', category: 'vegetables', unit: 'basket', currentPrice: 15000, trend: 'rising', trendPercentage: 20, demand: 'high', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Palm Oil (25 litres)', category: 'oil', unit: 'keg', currentPrice: 45000, trend: 'stable', trendPercentage: 5, demand: 'medium', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Cooking Gas (12.5kg)', category: 'fuel', unit: 'cylinder', currentPrice: 14000, trend: 'rising', trendPercentage: 8, demand: 'high', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Cement (50kg)', category: 'building', unit: 'bag', currentPrice: 9000, trend: 'rising', trendPercentage: 15, demand: 'medium', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Ankara Fabric (6 yards)', category: 'fashion', unit: 'piece', currentPrice: 8500, trend: 'stable', trendPercentage: 3, demand: 'medium', location: { city: 'Lagos', state: 'Lagos' } },
    { product: 'Indomie Noodles (carton)', category: 'food', unit: 'carton', currentPrice: 7500, trend: 'rising', trendPercentage: 10, demand: 'high', location: { city: 'Lagos', state: 'Lagos' } },
  ];
  await MarketPrice.insertMany(items);
};

exports.getMarketPrices = async (req, res) => {
  await seedMarketData();
  const { category, search, city } = req.query;
  const query = { isActive: true };
  if (category) query.category = category;
  if (city) query['location.city'] = city;
  if (search) query.product = { $regex: search, $options: 'i' };

  const prices = await MarketPrice.find(query).sort({ demand: -1, updatedAt: -1 });
  return successResponse(res, prices);
};

exports.getPriceTrends = async (req, res) => {
  await seedMarketData();
  const rising = await MarketPrice.find({ trend: 'rising', isActive: true }).sort({ trendPercentage: -1 }).limit(5);
  const falling = await MarketPrice.find({ trend: 'falling', isActive: true }).sort({ trendPercentage: 1 }).limit(5);
  const highDemand = await MarketPrice.find({ demand: 'high', isActive: true }).limit(5);
  return successResponse(res, { rising, falling, highDemand });
};

exports.getMarketIntelligence = async (req, res) => {
  await seedMarketData();
  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);

  // Get business top products
  const topProducts = await Transaction.aggregate([
    { $match: { business: businessId, type: 'sale' } },
    { $unwind: { path: '$products', preserveNullAndEmpty: false } },
    { $group: { _id: '$products.name', totalRevenue: { $sum: '$products.total' }, totalSold: { $sum: '$products.quantity' } } },
    { $sort: { totalRevenue: -1 } },
    { $limit: 5 },
  ]);

  // Get demand predictions by month
  const now = new Date();
  const month = now.getMonth() + 1;
  const seasonalOpportunities = [];
  if ([11, 12, 1].includes(month)) seasonalOpportunities.push({ product: 'Rice & Grains', reason: 'Festive season demand surge', expectedIncrease: '35%' });
  if ([8, 9, 10].includes(month)) seasonalOpportunities.push({ product: 'School Supplies', reason: 'Back to school season', expectedIncrease: '50%' });
  if ([3, 4].includes(month)) seasonalOpportunities.push({ product: 'Fabrics & Fashion', reason: 'Easter shopping season', expectedIncrease: '25%' });
  seasonalOpportunities.push({ product: 'Cooking Gas', reason: 'Consistent year-round demand', expectedIncrease: '5%' });

  const marketPrices = await MarketPrice.find({ isActive: true }).sort({ demand: -1 }).limit(10);

  return successResponse(res, { topProducts, seasonalOpportunities, marketPrices, lastUpdated: new Date() });
};

exports.getPriceRecommendation = async (req, res) => {
  const { productName } = req.query;
  const marketData = await MarketPrice.findOne({ product: { $regex: productName, $options: 'i' } });

  if (!marketData) {
    return successResponse(res, { recommendation: `No market data found for "${productName}". Consider researching local market prices.` });
  }

  const businessId = mongoose.Types.ObjectId.createFromHexString(req.params.businessId);
  const product = await Product.findOne({ business: businessId, name: { $regex: productName, $options: 'i' } });

  const recommendation = {
    marketPrice: marketData.currentPrice,
    trend: marketData.trend,
    demand: marketData.demand,
    yourPrice: product?.sellingPrice,
    suggestion: null,
  };

  if (product) {
    const diff = ((product.sellingPrice - marketData.currentPrice) / marketData.currentPrice) * 100;
    if (diff > 20) recommendation.suggestion = `Your price is ${diff.toFixed(0)}% above market. Consider reducing slightly to attract more buyers.`;
    else if (diff < -10) recommendation.suggestion = `Your price is ${Math.abs(diff).toFixed(0)}% below market. You can increase by ₦${(marketData.currentPrice - product.sellingPrice).toLocaleString()} to match market rate.`;
    else recommendation.suggestion = `Your price is competitive with the market. ✅`;
  }

  return successResponse(res, recommendation);
};

exports.addMarketPrice = async (req, res) => {
  const price = await MarketPrice.create(req.body);
  return successResponse(res, price, 'Price data added', 201);
};
