const mongoose = require('mongoose');

const savingsSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['personal', 'business', 'emergency', 'goal'], default: 'business' },
  targetAmount: { type: Number, default: 0 },
  currentAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'manual'], default: 'monthly' },
  autoSave: { type: Boolean, default: false },
  autoSaveAmount: { type: Number, default: 0 },
  targetDate: Date,
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  transactions: [{
    amount: Number,
    type: { type: String, enum: ['deposit', 'withdrawal'] },
    date: { type: Date, default: Date.now },
    notes: String,
  }],
}, { timestamps: true });

savingsSchema.index({ business: 1, user: 1 });
module.exports = mongoose.model('Savings', savingsSchema);
