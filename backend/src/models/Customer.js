const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  address: String,
  avatar: String,
  totalPurchases: { type: Number, default: 0 },
  totalDebt: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  notes: String,
  tags: [String],
  isActive: { type: Boolean, default: true },
  lastPurchaseDate: Date,
  loyaltyPoints: { type: Number, default: 0 },
}, { timestamps: true });

customerSchema.index({ business: 1 });
customerSchema.index({ business: 1, name: 'text', phone: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
