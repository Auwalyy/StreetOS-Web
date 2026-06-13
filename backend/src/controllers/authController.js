const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');
const { successResponse, errorResponse } = require('../utils/response');

const generateTokens = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
  return { token, refreshToken };
};

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return errorResponse(res, 'Email already registered', 400);

  const user = await User.create({ firstName, lastName, email, password, phone, role: role || 'trader' });
  const verifyToken = user.generateEmailVerificationToken();
  await user.save();

  await sendEmail({ to: email, ...emailTemplates.verification(firstName, verifyToken) }).catch(() => {});

  const { token, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  return successResponse(res, {
    user: { _id: user._id, firstName, lastName, email, role: user.role, isEmailVerified: user.isEmailVerified },
    token,
    refreshToken,
  }, 'Registration successful', 201);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return errorResponse(res, 'Invalid email or password', 401);
  }
  if (!user.isActive) return errorResponse(res, 'Account has been deactivated', 401);

  const { token, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  return successResponse(res, {
    user: { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatar: user.avatar, isEmailVerified: user.isEmailVerified },
    token,
    refreshToken,
  }, 'Login successful');
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return errorResponse(res, 'Refresh token required', 401);
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) return errorResponse(res, 'Invalid refresh token', 401);
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    return successResponse(res, tokens, 'Token refreshed');
  } catch {
    return errorResponse(res, 'Invalid refresh token', 401);
  }
};

exports.verifyEmail = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpire: { $gt: Date.now() } });
  if (!user) return errorResponse(res, 'Invalid or expired token', 400);
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();
  return successResponse(res, null, 'Email verified successfully');
};

exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return successResponse(res, null, 'If that email exists, a reset link has been sent');
  const token = user.generatePasswordResetToken();
  await user.save();
  await sendEmail({ to: user.email, ...emailTemplates.resetPassword(user.firstName, token) }).catch(() => {});
  return successResponse(res, null, 'Password reset email sent');
};

exports.resetPassword = async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpire: { $gt: Date.now() } });
  if (!user) return errorResponse(res, 'Invalid or expired token', 400);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  return successResponse(res, null, 'Password reset successfully');
};

exports.getMe = async (req, res) => {
  return successResponse(res, req.user);
};

exports.updateProfile = async (req, res) => {
  const allowed = ['firstName', 'lastName', 'phone', 'preferences'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  return successResponse(res, user, 'Profile updated');
};

exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) return errorResponse(res, 'Current password incorrect', 400);
  user.password = req.body.newPassword;
  await user.save();
  return successResponse(res, null, 'Password changed');
};

exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  return successResponse(res, null, 'Logged out');
};
