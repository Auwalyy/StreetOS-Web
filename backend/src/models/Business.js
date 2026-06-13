const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    enum: ['retail', 'food_vendor', 'artisan', 'transport', 'agriculture', 'fashion', 'electronics', 'healthcare', 'education', 'services', 'other'],
    required: true,
  },
  logo: { type: String, default: '' },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'Nigeria' },
    lga: String,
  },
  phone: String,
  email: String,
  website: String,
  registrationNumber: String,
  taxId: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String,
  },
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isVerified: { type: Boolean, default: false },
  verificationLevel: { type: Number, default: 0, min: 0, max: 3 },
  verificationBadge: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' },
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  healthScore: { type: Number, default: 0, min: 0, max: 100 },
  creditScore: { type: Number, default: 0, min: 0, max: 850 },
  loanReadinessScore: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  settings: {
    currency: { type: String, default: 'NGN' },
    taxRate: { type: Number, default: 0 },
    autoReminders: { type: Boolean, default: true },
  },
}, { timestamps: true });

businessSchema.index({ owner: 1 });
businessSchema.index({ category: 1 });
businessSchema.index({ 'address.city': 1 });
businessSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Business', businessSchema);
