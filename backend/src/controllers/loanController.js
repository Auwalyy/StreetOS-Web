const LoanApplication = require('../models/LoanApplication');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const LENDERS = [
  { id: 'sterling', name: 'Sterling Bank SME Loan', type: 'bank', maxAmount: 5000000, minAmount: 100000, rate: '18% p.a.', tenure: '12 months', requirements: ['6 months bank statement', 'BVN', 'Business registration'], logo: '🏦' },
  { id: 'lapo', name: 'LAPO Microfinance', type: 'microfinance', maxAmount: 500000, minAmount: 20000, rate: '3.5% monthly', tenure: '6 months', requirements: ['Group guarantee', 'BVN', 'Business address'], logo: '🤝' },
  { id: 'carbon', name: 'Carbon (One Finance)', type: 'fintech', maxAmount: 1000000, minAmount: 10000, rate: '5% monthly', tenure: '3-12 months', requirements: ['BVN', 'Phone number'], logo: '⚡' },
  { id: 'renmoney', name: 'RenMoney', type: 'fintech', maxAmount: 6000000, minAmount: 50000, rate: '2.8% monthly', tenure: '3-24 months', requirements: ['BVN', 'Employment/Business proof'], logo: '💳' },
  { id: 'fairmoney', name: 'FairMoney', type: 'fintech', maxAmount: 3000000, minAmount: 10000, rate: '10-30% annually', tenure: '1-18 months', requirements: ['BVN', 'Phone number'], logo: '📱' },
  { id: 'accion', name: 'Accion MFB', type: 'microfinance', maxAmount: 2000000, minAmount: 50000, rate: '4% monthly', tenure: '3-12 months', requirements: ['BVN', 'Business address', '6 months trading history'], logo: '🏛️' },
];

exports.getLenders = async (req, res) => {
  const { amount, type } = req.query;
  let lenders = LENDERS;
  if (type) lenders = lenders.filter(l => l.type === type);
  if (amount) lenders = lenders.filter(l => Number(amount) >= l.minAmount && Number(amount) <= l.maxAmount);
  return successResponse(res, lenders);
};

exports.applyForLoan = async (req, res) => {
  const application = await LoanApplication.create({ ...req.body, business: req.params.businessId, applicant: req.user._id });
  return successResponse(res, application, 'Loan application submitted', 201);
};

exports.getMyApplications = async (req, res) => {
  const applications = await LoanApplication.find({ business: req.params.businessId }).sort({ createdAt: -1 });
  return successResponse(res, applications);
};

exports.getApplication = async (req, res) => {
  const application = await LoanApplication.findOne({ _id: req.params.id, business: req.params.businessId }).populate('business', 'name').populate('applicant', 'firstName lastName email');
  if (!application) return errorResponse(res, 'Application not found', 404);
  return successResponse(res, application);
};

exports.updateApplicationStatus = async (req, res) => {
  const application = await LoanApplication.findByIdAndUpdate(req.params.id, {
    status: req.body.status,
    approvedBy: req.user._id,
    approvedAt: req.body.status === 'approved' ? new Date() : undefined,
    disbursedAt: req.body.status === 'disbursed' ? new Date() : undefined,
    notes: req.body.notes,
  }, { new: true });
  if (!application) return errorResponse(res, 'Application not found', 404);
  return successResponse(res, application, 'Status updated');
};

// Admin
exports.getAllApplications = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = {};
  if (status) query.status = status;
  const [apps, total] = await Promise.all([
    LoanApplication.find(query).populate('business', 'name').populate('applicant', 'firstName lastName email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    LoanApplication.countDocuments(query),
  ]);
  return paginatedResponse(res, apps, total, page, limit);
};
