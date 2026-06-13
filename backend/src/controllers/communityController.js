const CommunityPost = require('../models/CommunityPost');
const ContributionGroup = require('../models/ContributionGroup');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ============ COMMUNITY ============
exports.createPost = async (req, res) => {
  const post = await CommunityPost.create({ ...req.body, author: req.user._id });
  return successResponse(res, post, 'Post created', 201);
};

exports.getPosts = async (req, res) => {
  const { page = 1, limit = 20, type, search } = req.query;
  const query = { isApproved: true };
  if (type) query.type = type;
  if (search) query.$text = { $search: search };

  const [posts, total] = await Promise.all([
    CommunityPost.find(query).populate('author', 'firstName lastName avatar').sort({ isPinned: -1, createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    CommunityPost.countDocuments(query),
  ]);
  return paginatedResponse(res, posts, total, page, limit);
};

exports.getPost = async (req, res) => {
  const post = await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
    .populate('author', 'firstName lastName avatar')
    .populate('comments.author', 'firstName lastName avatar');
  if (!post) return errorResponse(res, 'Post not found', 404);
  return successResponse(res, post);
};

exports.likePost = async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return errorResponse(res, 'Post not found', 404);
  const liked = post.likes.includes(req.user._id);
  if (liked) post.likes.pull(req.user._id);
  else post.likes.push(req.user._id);
  await post.save();
  return successResponse(res, { liked: !liked, count: post.likes.length });
};

exports.addComment = async (req, res) => {
  const post = await CommunityPost.findByIdAndUpdate(
    req.params.id,
    { $push: { comments: { author: req.user._id, content: req.body.content } } },
    { new: true }
  ).populate('comments.author', 'firstName lastName avatar');
  return successResponse(res, post, 'Comment added');
};

// ============ CONTRIBUTION GROUPS ============
exports.createGroup = async (req, res) => {
  const group = await ContributionGroup.create({ ...req.body, creator: req.user._id });
  return successResponse(res, group, 'Group created', 201);
};

exports.getGroups = async (req, res) => {
  const groups = await ContributionGroup.find({
    $or: [{ creator: req.user._id }, { 'members.user': req.user._id }],
  }).populate('creator', 'firstName lastName');
  return successResponse(res, groups);
};

exports.getGroup = async (req, res) => {
  const group = await ContributionGroup.findById(req.params.id).populate('creator', 'firstName lastName').populate('members.user', 'firstName lastName');
  if (!group) return errorResponse(res, 'Group not found', 404);
  return successResponse(res, group);
};

exports.joinGroup = async (req, res) => {
  const group = await ContributionGroup.findById(req.params.id);
  if (!group) return errorResponse(res, 'Group not found', 404);
  if (group.members.length >= group.maxMembers) return errorResponse(res, 'Group is full', 400);
  const already = group.members.some(m => m.user?.toString() === req.user._id.toString());
  if (already) return errorResponse(res, 'Already a member', 400);
  group.members.push({ user: req.user._id, name: req.user.fullName || `${req.user.firstName} ${req.user.lastName}` });
  await group.save();
  return successResponse(res, group, 'Joined group');
};

exports.recordContribution = async (req, res) => {
  const { memberId, amount } = req.body;
  const group = await ContributionGroup.findById(req.params.id);
  if (!group) return errorResponse(res, 'Group not found', 404);
  const member = group.members.id(memberId);
  if (!member) return errorResponse(res, 'Member not found', 404);
  member.totalContributed += amount;
  group.totalCollected += amount;
  await group.save();
  return successResponse(res, group, 'Contribution recorded');
};
