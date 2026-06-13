const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  product: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  unit: { type: String, default: 'piece' },
  currentPrice: { type: Number, required: true },
  minPrice: Number,
  maxPrice: Number,
  location: { city: String, state: String, market: String },
  priceHistory: [{
    price: Number,
    date: { type: Date, default: Date.now },
    source: String,
  }],
  trend: { type: String, enum: ['rising', 'falling', 'stable'], default: 'stable' },
  trendPercentage: { type: Number, default: 0 },
  demand: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  season: String,
  source: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

marketPriceSchema.index({ product: 'text', category: 1 });
marketPriceSchema.index({ 'location.city': 1 });
marketPriceSchema.index({ category: 1, demand: 1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
