const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
const Savings = require('../models/Savings');
const Goal = require('../models/Goal');
const Notification = require('../models/Notification');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ============ SUPPLIERS ============
exports.createSupplier = async (req, res) => {
  const supplier = await Supplier.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, supplier, 'Supplier created', 201);
};

exports.getSuppliers = async (req, res) => {
  const { search } = req.query;
  const query = { business: req.params.businessId, isActive: true };
  if (search) query.name = { $regex: search, $options: 'i' };
  const suppliers = await Supplier.find(query).sort({ name: 1 });
  return successResponse(res, suppliers);
};

exports.updateSupplier = async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, req.body, { new: true });
  if (!supplier) return errorResponse(res, 'Supplier not found', 404);
  return successResponse(res, supplier, 'Supplier updated');
};

exports.deleteSupplier = async (req, res) => {
  await Supplier.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, { isActive: false });
  return successResponse(res, null, 'Supplier deleted');
};

// ============ EMPLOYEES ============
exports.createEmployee = async (req, res) => {
  const employee = await Employee.create({ ...req.body, business: req.params.businessId });
  return successResponse(res, employee, 'Employee created', 201);
};

exports.getEmployees = async (req, res) => {
  const employees = await Employee.find({ business: req.params.businessId, isActive: true });
  return successResponse(res, employees);
};

exports.updateEmployee = async (req, res) => {
  const employee = await Employee.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, req.body, { new: true });
  if (!employee) return errorResponse(res, 'Employee not found', 404);
  return successResponse(res, employee, 'Employee updated');
};

exports.deleteEmployee = async (req, res) => {
  await Employee.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, { isActive: false });
  return successResponse(res, null, 'Employee deleted');
};

exports.recordAttendance = async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!employee) return errorResponse(res, 'Employee not found', 404);
  employee.attendance.push(req.body);
  await employee.save();
  return successResponse(res, employee, 'Attendance recorded');
};

exports.recordSalaryPayment = async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!employee) return errorResponse(res, 'Employee not found', 404);
  employee.salaryHistory.push(req.body);
  await employee.save();
  return successResponse(res, employee, 'Salary recorded');
};

// ============ SAVINGS ============
exports.createSavings = async (req, res) => {
  const savings = await Savings.create({ ...req.body, business: req.params.businessId, user: req.user._id });
  return successResponse(res, savings, 'Savings plan created', 201);
};

exports.getSavings = async (req, res) => {
  const savings = await Savings.find({ business: req.params.businessId, user: req.user._id });
  return successResponse(res, savings);
};

exports.addSavingsTransaction = async (req, res) => {
  const savings = await Savings.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!savings) return errorResponse(res, 'Savings not found', 404);
  const { amount, type, notes } = req.body;
  savings.transactions.push({ amount, type, notes });
  if (type === 'deposit') savings.currentAmount += amount;
  else savings.currentAmount = Math.max(0, savings.currentAmount - amount);
  if (savings.currentAmount >= savings.targetAmount) savings.status = 'completed';
  await savings.save();
  return successResponse(res, savings, 'Transaction added');
};

// ============ GOALS ============
exports.createGoal = async (req, res) => {
  const goal = await Goal.create({ ...req.body, business: req.params.businessId, user: req.user._id });
  return successResponse(res, goal, 'Goal created', 201);
};

exports.getGoals = async (req, res) => {
  const goals = await Goal.find({ business: req.params.businessId, user: req.user._id }).sort({ createdAt: -1 });
  return successResponse(res, goals);
};

exports.updateGoal = async (req, res) => {
  const goal = await Goal.findOneAndUpdate({ _id: req.params.id, business: req.params.businessId }, req.body, { new: true });
  if (!goal) return errorResponse(res, 'Goal not found', 404);
  return successResponse(res, goal, 'Goal updated');
};

// ============ NOTIFICATIONS ============
exports.getNotifications = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [notifications, total] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Notification.countDocuments({ user: req.user._id }),
  ]);
  const unread = await Notification.countDocuments({ user: req.user._id, isRead: false });
  return successResponse(res, { notifications, total, unread });
};

exports.markNotificationRead = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true });
  return successResponse(res, null, 'Marked as read');
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  return successResponse(res, null, 'All marked as read');
};
