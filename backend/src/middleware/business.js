const Business = require('../models/Business');
const AuditLog = require('../models/AuditLog');
const { errorResponse } = require('../utils/response');

const requireBusiness = async (req, res, next) => {
  const businessId = req.params.businessId || req.body.businessId || req.query.businessId;
  if (!businessId) return errorResponse(res, 'Business ID required', 400);

  const business = await Business.findById(businessId);
  if (!business) return errorResponse(res, 'Business not found', 404);

  const isOwner = business.owner.toString() === req.user._id.toString();
  const isStaff = business.staff.some(s => s.toString() === req.user._id.toString());
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

  if (!isOwner && !isStaff && !isAdmin) return errorResponse(res, 'Access denied', 403);

  req.business = business;
  next();
};

const auditLog = (action) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data.success !== false) {
      AuditLog.create({
        user: req.user?._id,
        action,
        resource: req.baseUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: { method: req.method, path: req.path },
        status: 'success',
      }).catch(() => {});
    }
    return originalJson(data);
  };
  next();
};

module.exports = { requireBusiness, auditLog };
