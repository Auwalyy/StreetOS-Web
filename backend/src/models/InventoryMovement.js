const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: {
    type: String,
    enum: ['stock_in', 'stock_out', 'sale', 'return', 'damage', 'transfer', 'adjustment'],
    required: true,
  },
  quantity: { type: Number, required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  reason: String,
  reference: String, // sale ID, purchase order ID, etc.
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branch: String,
  cost: Number,
  notes: String,
}, { timestamps: true });

inventoryMovementSchema.index({ business: 1, createdAt: -1 });
inventoryMovementSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
