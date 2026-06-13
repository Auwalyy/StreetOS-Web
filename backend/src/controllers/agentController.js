const Agent = require('../models/Agent');
const User = require('../models/User');
const Business = require('../models/Business');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.registerAsAgent = async (req, res) => {
  const existing = await Agent.findOne({ user: req.user._id });
  if (existing) return errorResponse(res, 'Already registered as agent', 400);

  const agent = await Agent.create({ ...req.body, user: req.user._id });
  await User.findByIdAndUpdate(req.user._id, { role: 'agent' });
  return successResponse(res, agent, 'Agent profile created', 201);
};

exports.getAgentProfile = async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id }).populate('user', 'firstName lastName email phone').populate('merchants', 'name category');
  if (!agent) return errorResponse(res, 'Agent profile not found', 404);
  return successResponse(res, agent);
};

exports.updateAgentProfile = async (req, res) => {
  const agent = await Agent.findOneAndUpdate({ user: req.user._id }, req.body, { new: true });
  if (!agent) return errorResponse(res, 'Agent profile not found', 404);
  return successResponse(res, agent, 'Profile updated');
};

exports.onboardMerchant = async (req, res) => {
  const { businessId } = req.body;
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return errorResponse(res, 'Agent profile not found', 404);

  const business = await Business.findById(businessId);
  if (!business) return errorResponse(res, 'Business not found', 404);

  if (!agent.merchants.includes(businessId)) {
    agent.merchants.push(businessId);
    agent.merchantsOnboarded += 1;
    agent.commissions.push({
      merchant: businessId,
      amount: 500,
      type: 'onboarding',
      status: 'pending',
    });
    agent.pendingCommission += 500;
    await agent.save();
  }

  return successResponse(res, agent, 'Merchant onboarded');
};

exports.getAgentMerchants = async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id }).populate({
    path: 'merchants',
    populate: { path: 'owner', select: 'firstName lastName phone' },
  });
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  return successResponse(res, agent.merchants);
};

exports.getAgentCommissions = async (req, res) => {
  const agent = await Agent.findOne({ user: req.user._id });
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  return successResponse(res, { commissions: agent.commissions, total: agent.totalEarnings, pending: agent.pendingCommission });
};

exports.submitKYC = async (req, res) => {
  const { documents } = req.body;
  const agent = await Agent.findOneAndUpdate(
    { user: req.user._id },
    { kycDocuments: documents, kycStatus: 'submitted' },
    { new: true }
  );
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  return successResponse(res, agent, 'KYC submitted for review');
};

// Admin
exports.getAllAgents = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [agents, total] = await Promise.all([
    Agent.find().populate('user', 'firstName lastName email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Agent.countDocuments(),
  ]);
  return paginatedResponse(res, agents, total, page, limit);
};

exports.updateAgentStatus = async (req, res) => {
  const agent = await Agent.findByIdAndUpdate(req.params.id, { status: req.body.status, kycStatus: req.body.kycStatus }, { new: true });
  if (!agent) return errorResponse(res, 'Agent not found', 404);
  return successResponse(res, agent, 'Agent updated');
};
