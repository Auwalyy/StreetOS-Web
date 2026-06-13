const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  phone: String,
  email: String,
  address: String,
  products: [String],
  totalPurchases: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

supplierSchema.index({ business: 1 });
module.exports = mongoose.model('Supplier', supplierSchema);
