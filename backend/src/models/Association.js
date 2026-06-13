const mongoose = require('mongoose');

const associationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['market', 'trade', 'cooperative', 'artisan', 'transport', 'other'], default: 'market' },
  location: { city: String, state: String, lga: String },
  logo: String,
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    name: String,
    phone: String,
    joinedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    feesPaid: { type: Number, default: 0 },
    feesOwed: { type: Number, default: 0 },
  }],
  announcements: [{
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    isPinned: { type: Boolean, default: false },
  }],
  fees: {
    registration: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 },
    annual: { type: Number, default: 0 },
  },
  totalRevenue: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

associationSchema.index({ leader: 1 });
associationSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Association', associationSchema);
