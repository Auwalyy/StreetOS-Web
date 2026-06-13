const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { requireBusiness } = require('../middleware/business');

// Agent Routes
const agentRouter = express.Router();
const { registerAsAgent, getAgentProfile, updateAgentProfile, onboardMerchant, getAgentMerchants, getAgentCommissions, submitKYC, getAllAgents, updateAgentStatus } = require('../controllers/agentController');
agentRouter.use(protect);
agentRouter.post('/register', registerAsAgent);
agentRouter.get('/me', getAgentProfile);
agentRouter.put('/me', updateAgentProfile);
agentRouter.post('/onboard', onboardMerchant);
agentRouter.get('/merchants', getAgentMerchants);
agentRouter.get('/commissions', getAgentCommissions);
agentRouter.post('/kyc', submitKYC);
agentRouter.get('/', authorize('admin', 'super_admin'), getAllAgents);
agentRouter.put('/:id/status', authorize('admin', 'super_admin'), updateAgentStatus);

// Association Routes
const assocRouter = express.Router();
const { createAssociation, getAssociations, getAssociation, updateAssociation, joinAssociation, addAnnouncement, recordFeePayment, getMyAssociations } = require('../controllers/associationController');
assocRouter.use(protect);
assocRouter.post('/', createAssociation);
assocRouter.get('/', getAssociations);
assocRouter.get('/mine', getMyAssociations);
assocRouter.get('/:id', getAssociation);
assocRouter.put('/:id', updateAssociation);
assocRouter.post('/:id/join', joinAssociation);
assocRouter.post('/:id/announcements', addAnnouncement);
assocRouter.post('/:id/fees', recordFeePayment);

// Loan Routes
const loanRouter = express.Router({ mergeParams: true });
const { getLenders, applyForLoan, getMyApplications, getApplication, updateApplicationStatus, getAllApplications } = require('../controllers/loanController');
loanRouter.use(protect, requireBusiness);
loanRouter.get('/lenders', getLenders);
loanRouter.post('/apply', applyForLoan);
loanRouter.get('/applications', getMyApplications);
loanRouter.get('/applications/:id', getApplication);
loanRouter.put('/applications/:id/status', authorize('admin', 'super_admin', 'loan_officer'), updateApplicationStatus);

// Admin loan overview (no business context)
const loanAdminRouter = express.Router();
loanAdminRouter.use(protect, authorize('admin', 'super_admin', 'loan_officer'));
loanAdminRouter.get('/', getAllApplications);

// Market Intelligence Routes
const marketRouter = express.Router({ mergeParams: true });
const { getMarketPrices, getPriceTrends, getMarketIntelligence, getPriceRecommendation, addMarketPrice } = require('../controllers/marketController');
marketRouter.use(protect);
marketRouter.get('/prices', getMarketPrices);
marketRouter.get('/trends', getPriceTrends);
marketRouter.get('/intelligence', requireBusiness, getMarketIntelligence);
marketRouter.get('/price-recommendation', requireBusiness, getPriceRecommendation);
marketRouter.post('/prices', authorize('admin', 'super_admin'), addMarketPrice);

// Learning Routes
const learningRouter = express.Router();
const { getContent, getContentItem, likeContent, createContent } = require('../controllers/learningController');
learningRouter.get('/', getContent);
learningRouter.get('/:id', getContentItem);
learningRouter.post('/:id/like', protect, likeContent);
learningRouter.post('/', protect, authorize('admin', 'super_admin'), createContent);

// Fraud & Verification Routes
const fraudRouter = express.Router({ mergeParams: true });
const { runFraudDetection } = require('../controllers/verificationController');
fraudRouter.use(protect, requireBusiness);
fraudRouter.get('/fraud', runFraudDetection);

const verifyRouter = express.Router({ mergeParams: true });
const { verifyBusiness, getVerificationStatus } = require('../controllers/verificationController');
verifyRouter.use(protect);
verifyRouter.get('/', getVerificationStatus);
verifyRouter.post('/', verifyBusiness);

module.exports = { agentRouter, assocRouter, loanRouter, loanAdminRouter, marketRouter, learningRouter, fraudRouter, verifyRouter };
