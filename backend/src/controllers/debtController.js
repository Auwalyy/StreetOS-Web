const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const { sendEmail, emailTemplates } = require('../utils/email');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

exports.createDebt = async (req, res) => {
  const debt = await Debt.create({ ...req.body, business: req.params.businessId, balance: req.body.originalAmount });

  // Update customer total debt
  await Customer.findByIdAndUpdate(req.body.customer, { $inc: { totalDebt: req.body.originalAmount } });

  return successResponse(res, debt, 'Debt recorded', 201);
};

exports.getDebts = async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  const query = { business: req.params.businessId };
  if (status) query.status = status;
  if (type) query.type = type;

  const [debts, total] = await Promise.all([
    Debt.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).populate('customer', 'name phone'),
    Debt.countDocuments(query),
  ]);
  return paginatedResponse(res, debts, total, page, limit);
};

exports.getDebt = async (req, res) => {
  const debt = await Debt.findOne({ _id: req.params.id, business: req.params.businessId }).populate('customer');
  if (!debt) return errorResponse(res, 'Debt not found', 404);
  return successResponse(res, debt);
};

exports.recordPayment = async (req, res) => {
  const { amount, method, notes } = req.body;
  const debt = await Debt.findOne({ _id: req.params.id, business: req.params.businessId });
  if (!debt) return errorResponse(res, 'Debt not found', 404);

  debt.payments.push({ amount, method, notes });
  debt.amountPaid += amount;
  debt.balance = debt.originalAmount - debt.amountPaid;

  if (debt.balance <= 0) {
    debt.balance = 0;
    debt.status = 'paid';
    await Customer.findByIdAndUpdate(debt.customer, { $inc: { totalPaid: amount, totalDebt: -amount } });
  } else {
    debt.status = 'partial';
    await Customer.findByIdAndUpdate(debt.customer, { $inc: { totalPaid: amount, totalDebt: -amount } });
  }

  await debt.save();
  return successResponse(res, debt, 'Payment recorded');
};

exports.sendReminder = async (req, res) => {
  const debt = await Debt.findOne({ _id: req.params.id, business: req.params.businessId }).populate('customer');
  if (!debt) return errorResponse(res, 'Debt not found', 404);

  if (debt.customer.email) {
    const business = req.business;
    await sendEmail({
      to: debt.customer.email,
      ...emailTemplates.debtReminder(business.name, debt.customer.name, debt.balance, debt.dueDate),
    }).catch(() => {});
  }

  debt.remindersSent += 1;
  debt.lastReminderDate = new Date();
  await debt.save();

  return successResponse(res, null, 'Reminder sent');
};

exports.updateDebt = async (req, res) => {
  const debt = await Debt.findOneAndUpdate(
    { _id: req.params.id, business: req.params.businessId },
    req.body,
    { new: true }
  );
  if (!debt) return errorResponse(res, 'Debt not found', 404);
  return successResponse(res, debt, 'Debt updated');
};

exports.deleteDebt = async (req, res) => {
  await Debt.findOneAndDelete({ _id: req.params.id, business: req.params.businessId });
  return successResponse(res, null, 'Debt deleted');
};

exports.getDebtSummary = async (req, res) => {
  const summary = await Debt.aggregate([
    { $match: { business: require('mongoose').Types.ObjectId.createFromHexString(req.params.businessId) } },
    { $group: { _id: '$status', total: { $sum: '$balance' }, count: { $sum: 1 } } },
  ]);
  return successResponse(res, summary);
};
