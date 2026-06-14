const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const Supplier = require('../models/Supplier');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createPurchaseOrder = async (req, res) => {
  const { supplierId, supplierName, items, tax = 0, notes, expectedDate } = req.body;
  if (!items?.length) return errorResponse(res, 'Order must have at least one item', 400);

  const enrichedItems = items.map(i => ({ ...i, total: i.quantity * i.unitCost }));
  const subtotal = enrichedItems.reduce((s, i) => s + i.total, 0);
  const total = subtotal + (tax > 1 ? tax : subtotal * (tax / 100));

  const order = await PurchaseOrder.create({
    business: req.params.businessId,
    supplier: supplierId || null,
    supplierName,
    items: enrichedItems,
    subtotal,
    tax: total - subtotal,
    total,
    notes,
    expectedDate,
    createdBy: req.user._id,
  });

  return successResponse(res, order, 'Purchase order created', 201);
};

exports.getPurchaseOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = { business: req.params.businessId };
  if (status) query.status = status;

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(query).populate('supplier', 'name phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    PurchaseOrder.countDocuments(query),
  ]);
  return paginatedResponse(res, orders, total, page, limit);
};

exports.getPurchaseOrder = async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, business: req.params.businessId }).populate('supplier', 'name phone email');
  if (!order) return errorResponse(res, 'Order not found', 404);
  return successResponse(res, order);
};

exports.updatePurchaseOrder = async (req, res) => {
  const order = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true }
  );
  if (!order) return errorResponse(res, 'Order not found', 404);
  return successResponse(res, order, 'Order updated');
};

exports.receivePurchaseOrder = async (req, res) => {
  const { receivedItems } = req.body; // [{ product, receivedQuantity, unitCost }]
  const order = await PurchaseOrder.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!order) return errorResponse(res, 'Order not found', 404);

  for (const received of receivedItems) {
    const item = order.items.find(i => i.product?.toString() === received.product);
    if (item) item.receivedQuantity = received.receivedQuantity;

    if (received.product && received.receivedQuantity > 0) {
      const product = await Product.findOne({ _id: received.product, business: req.params.businessId });
      if (product) {
        const before = product.quantity;
        product.quantity += received.receivedQuantity;
        if (received.unitCost) product.costPrice = received.unitCost;
        await product.save();
        await InventoryMovement.create({
          business: req.params.businessId,
          product: product._id,
          type: 'stock_in',
          quantity: received.receivedQuantity,
          quantityBefore: before,
          quantityAfter: product.quantity,
          reference: order._id.toString(),
          performedBy: req.user._id,
          reason: `Purchase Order ${order.orderNumber}`,
          cost: received.unitCost,
        });
      }
    }
  }

  const allReceived = order.items.every(i => i.receivedQuantity >= i.quantity);
  const someReceived = order.items.some(i => i.receivedQuantity > 0);
  order.status = allReceived ? 'received' : someReceived ? 'partial' : order.status;
  order.receivedDate = new Date();
  await order.save();

  // Update supplier total purchases
  if (order.supplier) {
    await Supplier.findByIdAndUpdate(order.supplier, { $inc: { totalPurchases: order.total } });
  }

  return successResponse(res, order, 'Purchase order received');
};

exports.deletePurchaseOrder = async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!order) return errorResponse(res, 'Order not found', 404);
  if (order.status === 'received') return errorResponse(res, 'Cannot delete received order', 400);
  await order.deleteOne();
  return successResponse(res, null, 'Order deleted');
};
