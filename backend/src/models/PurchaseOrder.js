const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['draft', 'sent', 'received', 'partial', 'cancelled'], default: 'draft' },
  items: [{
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  }],
  totalAmount: { type: Number, default: 0 },
  expectedDate: Date,
  receivedAt: Date,
  notes: String,
}, { timestamps: true });

purchaseOrderSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
