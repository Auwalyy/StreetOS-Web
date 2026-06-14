const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true },
  total: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: String,
  orderNumber: { type: String, unique: true },
  items: [poItemSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'partial', 'received', 'cancelled'], default: 'draft' },
  expectedDate: Date,
  receivedDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments({ business: this.business });
    this.orderNumber = `PO-${Date.now().toString(36).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

purchaseOrderSchema.index({ business: 1, createdAt: -1 });
purchaseOrderSchema.index({ supplier: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
