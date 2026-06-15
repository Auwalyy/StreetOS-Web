const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  barcode: String,
  qrCode: String,
  description: String,
  category: { type: String, trim: true },
  brand: { type: String, trim: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  images: [String],
  sellingPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  wholesalePrice: { type: Number, default: 0, min: 0 },
  minimumPrice: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, default: 'piece' },
  lowStockThreshold: { type: Number, default: 5 },
  expiryDate: Date,
  location: String,
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  totalSold: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastSoldAt: Date,
  tags: [String],
  stockMovements: [{
    quantity: Number,
    type: { type: String, enum: ['stock_in', 'stock_out', 'sale', 'damage', 'adjustment', 'return'], default: 'adjustment' },
    reason: String,
    quantityBefore: Number,
    quantityAfter: Number,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reference: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

productSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

productSchema.virtual('profitMargin').get(function () {
  if (!this.costPrice || this.costPrice === 0) return 100;
  return (((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100).toFixed(2);
});

productSchema.virtual('profitPerUnit').get(function () {
  return this.sellingPrice - this.costPrice;
});

productSchema.index({ business: 1 });
productSchema.index({ business: 1, name: 'text', sku: 'text', barcode: 'text', tags: 'text' });
productSchema.index({ quantity: 1 });
productSchema.index({ lastSoldAt: -1 });

module.exports = mongoose.model('Product', productSchema);
