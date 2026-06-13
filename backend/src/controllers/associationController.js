const Association = require('../models/Association');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createAssociation = async (req, res) => {
  const association = await Association.create({ ...req.body, leader: req.user._id });
  return successResponse(res, association, 'Association created', 201);
};

exports.getAssociations = async (req, res) => {
  const { page = 1, limit = 20, search, city } = req.query;
  const query = { isActive: true };
  if (city) query['location.city'] = city;
  if (search) query.name = { $regex: search, $options: 'i' };

  const [associations, total] = await Promise.all([
    Association.find(query).populate('leader', 'firstName lastName phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Association.countDocuments(query),
  ]);
  return paginatedResponse(res, associations, total, page, limit);
};

exports.getAssociation = async (req, res) => {
  const association = await Association.findById(req.params.id).populate('leader', 'firstName lastName').populate('members.user', 'firstName lastName phone');
  if (!association) return errorResponse(res, 'Association not found', 404);
  return successResponse(res, association);
};

exports.updateAssociation = async (req, res) => {
  const association = await Association.findOneAndUpdate({ _id: req.params.id, leader: req.user._id }, req.body, { new: true });
  if (!association) return errorResponse(res, 'Not found or unauthorized', 404);
  return successResponse(res, association, 'Updated');
};

exports.joinAssociation = async (req, res) => {
  const association = await Association.findById(req.params.id);
  if (!association) return errorResponse(res, 'Association not found', 404);

  const already = association.members.some(m => m.user?.toString() === req.user._id.toString());
  if (already) return errorResponse(res, 'Already a member', 400);

  association.members.push({ user: req.user._id, name: `${req.user.firstName} ${req.user.lastName}`, phone: req.user.phone, business: req.body.businessId });
  await association.save();
  return successResponse(res, association, 'Joined association');
};

exports.addAnnouncement = async (req, res) => {
  const association = await Association.findOne({ _id: req.params.id, leader: req.user._id });
  if (!association) return errorResponse(res, 'Not found or unauthorized', 404);
  association.announcements.push({ ...req.body, author: req.user._id });
  await association.save();
  return successResponse(res, association, 'Announcement posted');
};

exports.recordFeePayment = async (req, res) => {
  const { memberId, amount } = req.body;
  const association = await Association.findOne({ _id: req.params.id, leader: req.user._id });
  if (!association) return errorResponse(res, 'Not found or unauthorized', 404);

  const member = association.members.id(memberId);
  if (!member) return errorResponse(res, 'Member not found', 404);

  member.feesPaid += amount;
  association.totalRevenue += amount;
  await association.save();
  return successResponse(res, association, 'Fee payment recorded');
};

exports.getMyAssociations = async (req, res) => {
  const associations = await Association.find({
    $or: [{ leader: req.user._id }, { 'members.user': req.user._id }],
    isActive: true,
  }).populate('leader', 'firstName lastName');
  return successResponse(res, associations);
};
