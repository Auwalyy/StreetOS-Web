import api from './client'

const b = (id) => `/businesses/${id}`

// AUTH
export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  getMe: () => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/me', d),
  changePassword: (d) => api.put('/auth/change-password', d),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  resetPassword: (token, d) => api.post(`/auth/reset-password/${token}`, d),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
}

// BUSINESSES
export const businessApi = {
  create: (d) => api.post('/businesses', d),
  getAll: () => api.get('/businesses'),
  get: (id) => api.get(`/businesses/${id}`),
  update: (id, d) => api.put(`/businesses/${id}`, d),
  delete: (id) => api.delete(`/businesses/${id}`),
  uploadLogo: (id, form) => api.post(`/businesses/${id}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getStats: (id) => api.get(`${b(id)}/stats`),
}

// TRANSACTIONS
export const transactionApi = {
  create: (bid, d) => api.post(`${b(bid)}/transactions`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/transactions`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/transactions/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/transactions/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/transactions/${id}`),
  getSummary: (bid, params) => api.get(`${b(bid)}/transactions/summary`, { params }),
  createVoice: (bid, d) => api.post(`${b(bid)}/transactions/voice`, d),
}

// PRODUCTS (legacy — kept for backward compat)
export const productApi = {
  create: (bid, d) => api.post(`${b(bid)}/products`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/products`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/products/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/products/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/products/${id}`),
  adjustStock: (bid, id, d) => api.post(`${b(bid)}/products/${id}/adjust-stock`, d),
  getLowStock: (bid) => api.get(`${b(bid)}/products/low-stock`),
}

// INVENTORY
export const inventoryApi = {
  getProducts: (bid, params) => api.get(`${b(bid)}/inventory`, { params }),
  createProduct: (bid, d) => api.post(`${b(bid)}/inventory`, d),
  getProduct: (bid, id) => api.get(`${b(bid)}/inventory/${id}`),
  updateProduct: (bid, id, d) => api.put(`${b(bid)}/inventory/${id}`, d),
  deleteProduct: (bid, id) => api.delete(`${b(bid)}/inventory/${id}`),
  archiveProduct: (bid, id) => api.post(`${b(bid)}/inventory/${id}/archive`),
  restoreProduct: (bid, id) => api.post(`${b(bid)}/inventory/${id}/restore`),
  adjustStock: (bid, id, d) => api.post(`${b(bid)}/inventory/${id}/adjust-stock`, d),
  getLowStock: (bid) => api.get(`${b(bid)}/inventory/low-stock`),
  getByBarcode: (bid, code) => api.get(`${b(bid)}/inventory/barcode/${code}`),
  getMovements: (bid, params) => api.get(`${b(bid)}/inventory/movements`, { params }),
  detectLeakage: (bid) => api.get(`${b(bid)}/inventory/leakage`),
  getForecast: (bid) => api.get(`${b(bid)}/inventory/forecast`),
  getDeadStock: (bid, params) => api.get(`${b(bid)}/inventory/dead-stock`, { params }),
  getPerformance: (bid, params) => api.get(`${b(bid)}/inventory/performance`, { params }),
  getReport: (bid) => api.get(`${b(bid)}/inventory/report`),
}

// POS / SALES
export const salesApi = {
  createSale: (bid, d) => api.post(`${b(bid)}/sales`, d),
  getSales: (bid, params) => api.get(`${b(bid)}/sales`, { params }),
  getSale: (bid, id) => api.get(`${b(bid)}/sales/${id}`),
  getSummary: (bid, params) => api.get(`${b(bid)}/sales/summary`, { params }),
  voidSale: (bid, id) => api.post(`${b(bid)}/sales/${id}/void`),
  parseVoice: (bid, d) => api.post(`${b(bid)}/sales/voice-parse`, d),
}

// PURCHASE ORDERS
export const purchaseOrderApi = {
  create: (bid, d) => api.post(`${b(bid)}/purchase-orders`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/purchase-orders`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/purchase-orders/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/purchase-orders/${id}`, d),
  receive: (bid, id, d) => api.post(`${b(bid)}/purchase-orders/${id}/receive`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/purchase-orders/${id}`),
}

// CUSTOMERS
export const customerApi = {
  create: (bid, d) => api.post(`${b(bid)}/customers`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/customers`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/customers/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/customers/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/customers/${id}`),
}

// DEBTS
export const debtApi = {
  create: (bid, d) => api.post(`${b(bid)}/debts`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/debts`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/debts/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/debts/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/debts/${id}`),
  recordPayment: (bid, id, d) => api.post(`${b(bid)}/debts/${id}/payment`, d),
  sendReminder: (bid, id) => api.post(`${b(bid)}/debts/${id}/reminder`),
  getSummary: (bid) => api.get(`${b(bid)}/debts/summary`),
}

// ANALYTICS
export const analyticsApi = {
  getDashboard: (bid) => api.get(`${b(bid)}/analytics/dashboard`),
  getRevenueChart: (bid, params) => api.get(`${b(bid)}/analytics/revenue-chart`, { params }),
  getTopProducts: (bid) => api.get(`${b(bid)}/analytics/top-products`),
  getHealthScore: (bid) => api.get(`${b(bid)}/analytics/health-score`),
}

// SUPPLIERS
export const supplierApi = {
  create: (bid, d) => api.post(`${b(bid)}/suppliers`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/suppliers`, { params }),
  update: (bid, id, d) => api.put(`${b(bid)}/suppliers/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/suppliers/${id}`),
}

// EMPLOYEES
export const employeeApi = {
  create: (bid, d) => api.post(`${b(bid)}/employees`, d),
  getAll: (bid) => api.get(`${b(bid)}/employees`),
  update: (bid, id, d) => api.put(`${b(bid)}/employees/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/employees/${id}`),
  recordAttendance: (bid, id, d) => api.post(`${b(bid)}/employees/${id}/attendance`, d),
  recordSalary: (bid, id, d) => api.post(`${b(bid)}/employees/${id}/salary`, d),
}

// SAVINGS & GOALS
export const savingsApi = {
  create: (bid, d) => api.post(`${b(bid)}/savings`, d),
  getAll: (bid) => api.get(`${b(bid)}/savings`),
  addTransaction: (bid, id, d) => api.post(`${b(bid)}/savings/${id}/transaction`, d),
}
export const goalApi = {
  create: (bid, d) => api.post(`${b(bid)}/goals`, d),
  getAll: (bid) => api.get(`${b(bid)}/goals`),
  update: (bid, id, d) => api.put(`${b(bid)}/goals/${id}`, d),
}

// AI
export const aiApi = {
  getAdvice: (bid) => api.get(`${b(bid)}/ai/advice`),
  parseVoice: (bid, d) => api.post(`${b(bid)}/ai/voice-parse`, d),
  getLoanReadiness: (bid) => api.get(`${b(bid)}/ai/loan-readiness`),
  getPassport: (bid) => api.get(`${b(bid)}/ai/passport`),
}

// NOTIFICATIONS
export const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

// COMMUNITY
export const communityApi = {
  createPost: (d) => api.post('/community/posts', d),
  getPosts: (params) => api.get('/community/posts', { params }),
  getPost: (id) => api.get(`/community/posts/${id}`),
  likePost: (id) => api.post(`/community/posts/${id}/like`),
  addComment: (id, d) => api.post(`/community/posts/${id}/comments`, d),
}

// GROUPS (Adashe/Esusu)
export const groupApi = {
  create: (d) => api.post('/groups', d),
  getAll: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  join: (id) => api.post(`/groups/${id}/join`),
  recordContribution: (id, d) => api.post(`/groups/${id}/contribution`, d),
}

// AGENTS
export const agentApi = {
  register: (d) => api.post('/agents/register', d),
  getProfile: () => api.get('/agents/me'),
  updateProfile: (d) => api.put('/agents/me', d),
  onboardMerchant: (d) => api.post('/agents/onboard', d),
  getMerchants: () => api.get('/agents/merchants'),
  getCommissions: () => api.get('/agents/commissions'),
  submitKYC: (d) => api.post('/agents/kyc', d),
  getAll: (params) => api.get('/agents', { params }),
}

// ASSOCIATIONS
export const associationApi = {
  create: (d) => api.post('/associations', d),
  getAll: (params) => api.get('/associations', { params }),
  getMine: () => api.get('/associations/mine'),
  get: (id) => api.get(`/associations/${id}`),
  update: (id, d) => api.put(`/associations/${id}`, d),
  join: (id, d) => api.post(`/associations/${id}/join`, d),
  addAnnouncement: (id, d) => api.post(`/associations/${id}/announcements`, d),
  recordFee: (id, d) => api.post(`/associations/${id}/fees`, d),
}

// LOANS (SME Credit Marketplace)
export const loanApi = {
  getLenders: (bid, params) => api.get(`${b(bid)}/loans/lenders`, { params }),
  apply: (bid, d) => api.post(`${b(bid)}/loans/apply`, d),
  getApplications: (bid) => api.get(`${b(bid)}/loans/applications`),
  getApplication: (bid, id) => api.get(`${b(bid)}/loans/applications/${id}`),
  updateStatus: (bid, id, d) => api.put(`${b(bid)}/loans/applications/${id}/status`, d),
  getAllAdmin: (params) => api.get('/loans/admin', { params }),
}

// MARKET INTELLIGENCE
export const marketApi = {
  getPrices: (params) => api.get('/market/prices', { params }),
  getTrends: () => api.get('/market/trends'),
  getIntelligence: (bid) => api.get(`${b(bid)}/market/intelligence`),
  getPriceRecommendation: (bid, params) => api.get(`${b(bid)}/market/price-recommendation`, { params }),
}

// LEARNING CENTER
export const learningApi = {
  getAll: (params) => api.get('/learning', { params }),
  get: (id) => api.get(`/learning/${id}`),
  like: (id) => api.post(`/learning/${id}/like`),
  create: (d) => api.post('/learning', d),
}

// SECURITY / FRAUD
export const securityApi = {
  runFraudDetection: (bid) => api.get(`${b(bid)}/security/fraud`),
  getVerification: (bid) => api.get(`${b(bid)}/verification`),
  submitVerification: (bid, d) => api.post(`${b(bid)}/verification`, d),
}

// ADMIN
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, d) => api.put(`/admin/users/${id}`, d),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getBusinesses: (params) => api.get('/admin/businesses', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
}
