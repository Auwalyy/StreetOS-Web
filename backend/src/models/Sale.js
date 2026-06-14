const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  sku: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  profit: { type: Number, default: 0 },
}, { _id: false });

const saleSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  totalProfit: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay', 'credit', 'other'],
    default: 'cash',
  },
  paymentStatus: { type: String, enum: ['paid', 'pending', 'partial'], default: 'paid' },
  amountPaid: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  notes: String,
  isVoiceEntry: { type: Boolean, default: false },
  voiceTranscript: String,
  priceType: { type: String, enum: ['retail', 'wholesale', 'special'], default: 'retail' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-generate invoice number
saleSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments({ business: this.business });
    const pad = String(count + 1).padStart(5, '0');
    this.invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${pad}`;
  }
  next();
});

saleSchema.index({ business: 1, date: -1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ invoiceNumber: 1 });
saleSchema.index({ soldBy: 1 });

module.exports = mongoose.model('Sale', saleSchema);
