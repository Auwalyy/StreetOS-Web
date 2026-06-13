const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['revenue', 'profit', 'savings', 'expense_reduction', 'customer', 'inventory'], required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  period: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'], required: true },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  status: { type: String, enum: ['active', 'completed', 'failed', 'paused'], default: 'active' },
  progress: { type: Number, default: 0 },
}, { timestamps: true });

goalSchema.index({ business: 1, status: 1 });
module.exports = mongoose.model('Goal', goalSchema);
