const User = require('../models/User');
const Business = require('../models/Business');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.getDashboard = async (req, res) => {
  const [users, businesses, transactions] = await Promise.all([
    User.countDocuments(),
    Business.countDocuments({ isActive: true }),
    Transaction.countDocuments(),
  ]);
  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('firstName lastName email role createdAt');
  return successResponse(res, { users, businesses, transactions, recentUsers });
};

exports.getUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) query.$or = [{ firstName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    User.countDocuments(query),
  ]);
  return paginatedResponse(res, users, total, page, limit);
};

exports.updateUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!user) return errorResponse(res, 'User not found', 404);
  return successResponse(res, user, 'User updated');
};

exports.toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return errorResponse(res, 'User not found', 404);
  user.isActive = !user.isActive;
  await user.save();
  return successResponse(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
};

exports.getBusinesses = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) query.name = { $regex: search, $options: 'i' };

  const [businesses, total] = await Promise.all([
    Business.find(query).populate('owner', 'firstName lastName email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Business.countDocuments(query),
  ]);
  return paginatedResponse(res, businesses, total, page, limit);
};

exports.getAuditLogs = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const [logs, total] = await Promise.all([
    AuditLog.find().populate('user', 'firstName lastName email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    AuditLog.countDocuments(),
  ]);
  return paginatedResponse(res, logs, total, page, limit);
};
