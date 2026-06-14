const express = require('express');
const { protect } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');
const { authorize } = require('../middleware/auth');

// Customer Routes
const customerRouter = express.Router({ mergeParams: true });
const { createCustomer, getCustomers, getCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
customerRouter.use(protect, requireBusiness);
customerRouter.route('/').get(getCustomers).post(createCustomer);
customerRouter.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

// Debt Routes
const debtRouter = express.Router({ mergeParams: true });
const { createDebt, getDebts, getDebt, recordPayment, sendReminder, updateDebt, deleteDebt, getDebtSummary } = require('../controllers/debtController');
debtRouter.use(protect, requireBusiness);
debtRouter.route('/').get(getDebts).post(createDebt);
debtRouter.get('/summary', getDebtSummary);
debtRouter.route('/:id').get(getDebt).put(updateDebt).delete(deleteDebt);
debtRouter.post('/:id/payment', recordPayment);
debtRouter.post('/:id/reminder', sendReminder);

// Analytics Routes
const analyticsRouter = express.Router({ mergeParams: true });
const { getDashboardStats, getRevenueChart, getTopProducts, getBusinessHealthScore } = require('../controllers/analyticsController');
analyticsRouter.use(protect, requireBusiness);
analyticsRouter.get('/dashboard', getDashboardStats);
analyticsRouter.get('/revenue-chart', getRevenueChart);
analyticsRouter.get('/top-products', getTopProducts);
analyticsRouter.get('/health-score', getBusinessHealthScore);

// Resource Routes (suppliers, employees, savings, goals)
const resourceRouter = express.Router({ mergeParams: true });
const {
  createSupplier, getSuppliers, updateSupplier, deleteSupplier,
  createEmployee, getEmployees, updateEmployee, deleteEmployee, recordAttendance, recordSalaryPayment,
  createSavings, getSavings, addSavingsTransaction,
  createGoal, getGoals, updateGoal,
} = require('../controllers/resourceController');
resourceRouter.use(protect, requireBusiness);
resourceRouter.route('/suppliers').get(getSuppliers).post(createSupplier);
resourceRouter.route('/suppliers/:id').put(updateSupplier).delete(deleteSupplier);
resourceRouter.route('/employees').get(getEmployees).post(createEmployee);
resourceRouter.route('/employees/:id').put(updateEmployee).delete(deleteEmployee);
resourceRouter.post('/employees/:id/attendance', recordAttendance);
resourceRouter.post('/employees/:id/salary', recordSalaryPayment);
resourceRouter.route('/savings').get(getSavings).post(createSavings);
resourceRouter.post('/savings/:id/transaction', addSavingsTransaction);
resourceRouter.route('/goals').get(getGoals).post(createGoal);
resourceRouter.put('/goals/:id', updateGoal);

// AI Routes
const aiRouter = express.Router({ mergeParams: true });
const { getAIAdvice, parseVoiceTransaction, getLoanReadiness, getBusinessPassport, inventoryChat } = require('../controllers/aiController');
aiRouter.use(protect, requireBusiness);
aiRouter.get('/advice', getAIAdvice);
aiRouter.post('/voice-parse', parseVoiceTransaction);
aiRouter.get('/loan-readiness', getLoanReadiness);
aiRouter.get('/passport', getBusinessPassport);
aiRouter.post('/chat', inventoryChat);

// Notification Routes
const notifRouter = express.Router();
const { getNotifications, markNotificationRead, markAllRead } = require('../controllers/resourceController');
notifRouter.use(protect);
notifRouter.get('/', getNotifications);
notifRouter.put('/:id/read', markNotificationRead);
notifRouter.put('/read-all', markAllRead);

// Community Routes
const communityRouter = express.Router();
const { createPost, getPosts, getPost, likePost, addComment } = require('../controllers/communityController');
communityRouter.use(protect);
communityRouter.route('/posts').get(getPosts).post(createPost);
communityRouter.get('/posts/:id', getPost);
communityRouter.post('/posts/:id/like', likePost);
communityRouter.post('/posts/:id/comments', addComment);

// Contribution Group Routes
const groupRouter = express.Router();
const { createGroup, getGroups, getGroup, joinGroup, recordContribution } = require('../controllers/communityController');
groupRouter.use(protect);
groupRouter.route('/').get(getGroups).post(createGroup);
groupRouter.get('/:id', getGroup);
groupRouter.post('/:id/join', joinGroup);
groupRouter.post('/:id/contribution', recordContribution);

// Admin Routes
const adminRouter = express.Router();
const { getDashboard, getUsers, updateUser, toggleUserStatus, getBusinesses, getAuditLogs } = require('../controllers/adminController');
adminRouter.use(protect, authorize('admin', 'super_admin'));
adminRouter.get('/dashboard', getDashboard);
adminRouter.get('/users', getUsers);
adminRouter.put('/users/:id', updateUser);
adminRouter.put('/users/:id/toggle-status', toggleUserStatus);
adminRouter.get('/businesses', getBusinesses);
adminRouter.get('/audit-logs', getAuditLogs);

module.exports = { customerRouter, debtRouter, analyticsRouter, resourceRouter, aiRouter, notifRouter, communityRouter, groupRouter, adminRouter };
