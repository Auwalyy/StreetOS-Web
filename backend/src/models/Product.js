const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  description: String,
  category: { type: String, trim: true },
  images: [String],
  sellingPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'piece' },
  lowStockThreshold: { type: Number, default: 5 },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  isActive: { type: Boolean, default: true },
  barcode: String,
  expiryDate: Date,
  location: String,
}, { timestamps: true });

productSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

productSchema.virtual('profitMargin').get(function () {
  if (!this.costPrice || this.costPrice === 0) return 100;
  return (((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100).toFixed(2);
});

productSchema.index({ business: 1 });
productSchema.index({ business: 1, name: 'text' });
productSchema.index({ quantity: 1 });

module.exports = mongoose.model('Product', productSchema);
