const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['sale', 'expense', 'income', 'refund', 'transfer', 'debt_payment', 'savings'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  description: { type: String, trim: true },
  category: { type: String, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  paymentMethod: { type: String, enum: ['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay', 'other'], default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'partial', 'cancelled'], default: 'paid' },
  reference: { type: String, unique: true, sparse: true },
  notes: String,
  attachments: [String],
  isVoiceEntry: { type: Boolean, default: false },
  voiceTranscript: String,
  tags: [String],
  date: { type: Date, default: Date.now },
}, { timestamps: true });

transactionSchema.index({ business: 1, date: -1 });
transactionSchema.index({ business: 1, type: 1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
