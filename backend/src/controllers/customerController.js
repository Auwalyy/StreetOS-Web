const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const Debt = require('../models/Debt');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createCustomer = async (req, res) => {
  const customer = await Customer.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, customer, 'Customer created', 201);
};

exports.getCustomers = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = { business: req.params.businessId, isActive: true };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];

  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ totalPurchases: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Customer.countDocuments(query),
  ]);
  return paginatedResponse(res, customers, total, page, limit);
};

exports.getCustomer = async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!customer) return errorResponse(res, 'Customer not found', 404);

  const [transactions, debts] = await Promise.all([
    Transaction.find({ customer: customer._id }).sort({ date: -1 }).limit(10),
    Debt.find({ customer: customer._id, status: { $in: ['active', 'partial'] } }),
  ]);

  return successResponse(res, { customer, transactions, debts });
};

exports.updateCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true }
  );
  if (!customer) return errorResponse(res, 'Customer not found', 404);
  return successResponse(res, customer, 'Customer updated');
};

exports.deleteCustomer = async (req, res) => {
  await Customer.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, { isActive: false });
  return successResponse(res, null, 'Customer deleted');
};
