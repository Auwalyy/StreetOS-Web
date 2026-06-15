const mongoose = require('mongoose');
const Product = require('../models/Product');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// Inline schema — no separate model needed for MVP
const PurchaseOrder = require('../models/PurchaseOrder');

exports.createPurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.create({ ...req.body, business: req.params.businessId, createdBy: req.user._id });
  return successResponse(res, po, 'Purchase order created', 201);
};

exports.getPurchaseOrders = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [orders, total] = await Promise.all([
    PurchaseOrder.find({ business: req.params.businessId }).populate('supplier', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    PurchaseOrder.countDocuments({ business: req.params.businessId }),
  ]);
  return paginatedResponse(res, orders, total, page, limit);
};

exports.getPurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, business: req.params.businessId }).populate('supplier', 'name phone');
  if (!po) return errorResponse(res, 'Purchase order not found', 404);
  return successResponse(res, po);
};

exports.updatePurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, req.body, { new: true });
  if (!po) return errorResponse(res, 'Purchase order not found', 404);
  return successResponse(res, po, 'Updated');
};

exports.receivePurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!po) return errorResponse(res, 'Purchase order not found', 404);
  if (po.status === 'received') return errorResponse(res, 'Already received', 400);

  // Update inventory stock for each item
  for (const item of po.items) {
    // Try to find product by name
    const product = await Product.findOne({
      business: req.params.businessId,
      name: { $regex: item.productName, $options: 'i' },
    });
    if (product) {
      const before = product.quantity;
      product.quantity += item.quantity;
      product.stockMovements = product.stockMovements || [];
      product.stockMovements.push({
        quantity: item.quantity,
        type: 'stock_in',
        reason: `Purchase Order — ${po._id}`,
        quantityBefore: before,
        quantityAfter: product.quantity,
        performedBy: req.user._id,
        createdAt: new Date(),
      });
      await product.save();
    }
  }

  po.status = 'received';
  po.receivedAt = new Date();
  await po.save();
  return successResponse(res, po, 'Stock received and inventory updated');
};

exports.deletePurchaseOrder = async (req, res) => {
  await PurchaseOrder.findOneAndDelete({ _id: req.params.id, business: req.params.businessId, status: 'draft' });
  return successResponse(res, null, 'Deleted');
};
