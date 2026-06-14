import api from './client';

const b = (id) => `/businesses/${id}`;

export const authApi = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  getMe: () => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/me', d),
  changePassword: (d) => api.put('/auth/change-password', d),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
};

export const businessApi = {
  create: (d) => api.post('/businesses', d),
  getAll: () => api.get('/businesses'),
  get: (id) => api.get(`/businesses/${id}`),
  update: (id, d) => api.put(`/businesses/${id}`, d),
  getStats: (id) => api.get(`${b(id)}/stats`),
};

export const transactionApi = {
  create: (bid, d) => api.post(`${b(bid)}/transactions`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/transactions`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/transactions/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/transactions/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/transactions/${id}`),
  getSummary: (bid, params) => api.get(`${b(bid)}/transactions/summary`, { params }),
};

export const productApi = {
  create: (bid, d) => api.post(`${b(bid)}/products`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/products`, { params }),
  update: (bid, id, d) => api.put(`${b(bid)}/products/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/products/${id}`),
  adjustStock: (bid, id, d) => api.post(`${b(bid)}/products/${id}/adjust-stock`, d),
};

export const inventoryApi = {
  getProducts: (bid, params) => api.get(`${b(bid)}/inventory`, { params }),
  createProduct: (bid, d) => api.post(`${b(bid)}/inventory`, d),
  updateProduct: (bid, id, d) => api.put(`${b(bid)}/inventory/${id}`, d),
  deleteProduct: (bid, id) => api.delete(`${b(bid)}/inventory/${id}`),
  archiveProduct: (bid, id) => api.post(`${b(bid)}/inventory/${id}/archive`),
  restoreProduct: (bid, id) => api.post(`${b(bid)}/inventory/${id}/restore`),
  adjustStock: (bid, id, d) => api.post(`${b(bid)}/inventory/${id}/adjust-stock`, d),
  getLowStock: (bid) => api.get(`${b(bid)}/inventory/low-stock`),
  getByBarcode: (bid, code) => api.get(`${b(bid)}/inventory/barcode/${code}`),
  getReport: (bid) => api.get(`${b(bid)}/inventory/report`),
  getForecast: (bid) => api.get(`${b(bid)}/inventory/forecast`),
};

export const salesApi = {
  createSale: (bid, d) => api.post(`${b(bid)}/sales`, d),
  getSales: (bid, params) => api.get(`${b(bid)}/sales`, { params }),
  getSale: (bid, id) => api.get(`${b(bid)}/sales/${id}`),
  getSummary: (bid, params) => api.get(`${b(bid)}/sales/summary`, { params }),
  voidSale: (bid, id) => api.post(`${b(bid)}/sales/${id}/void`),
  parseVoice: (bid, d) => api.post(`${b(bid)}/sales/voice-parse`, d),
};

export const purchaseOrderApi = {
  create: (bid, d) => api.post(`${b(bid)}/purchase-orders`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/purchase-orders`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/purchase-orders/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/purchase-orders/${id}`, d),
  receive: (bid, id, d) => api.post(`${b(bid)}/purchase-orders/${id}/receive`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/purchase-orders/${id}`),
};

export const customerApi = {
  create: (bid, d) => api.post(`${b(bid)}/customers`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/customers`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/customers/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/customers/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/customers/${id}`),
};

export const debtApi = {
  create: (bid, d) => api.post(`${b(bid)}/debts`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/debts`, { params }),
  update: (bid, id, d) => api.put(`${b(bid)}/debts/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/debts/${id}`),
  recordPayment: (bid, id, d) => api.post(`${b(bid)}/debts/${id}/payment`, d),
  sendReminder: (bid, id) => api.post(`${b(bid)}/debts/${id}/reminder`),
  getSummary: (bid) => api.get(`${b(bid)}/debts/summary`),
};

export const analyticsApi = {
  getDashboard: (bid) => api.get(`${b(bid)}/analytics/dashboard`),
  getRevenueChart: (bid, params) => api.get(`${b(bid)}/analytics/revenue-chart`, { params }),
  getTopProducts: (bid) => api.get(`${b(bid)}/analytics/top-products`),
  getHealthScore: (bid) => api.get(`${b(bid)}/analytics/health-score`),
};

export const supplierApi = {
  create: (bid, d) => api.post(`${b(bid)}/suppliers`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/suppliers`, { params }),
  update: (bid, id, d) => api.put(`${b(bid)}/suppliers/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/suppliers/${id}`),
};

export const employeeApi = {
  create: (bid, d) => api.post(`${b(bid)}/employees`, d),
  getAll: (bid) => api.get(`${b(bid)}/employees`),
  update: (bid, id, d) => api.put(`${b(bid)}/employees/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/employees/${id}`),
};

export const savingsApi = {
  create: (bid, d) => api.post(`${b(bid)}/savings`, d),
  getAll: (bid) => api.get(`${b(bid)}/savings`),
  addTransaction: (bid, id, d) => api.post(`${b(bid)}/savings/${id}/transaction`, d),
};

export const goalApi = {
  create: (bid, d) => api.post(`${b(bid)}/goals`, d),
  getAll: (bid) => api.get(`${b(bid)}/goals`),
  update: (bid, id, d) => api.put(`${b(bid)}/goals/${id}`, d),
};

export const aiApi = {
  getAdvice: (bid) => api.get(`${b(bid)}/ai/advice`),
  parseVoice: (bid, d) => api.post(`${b(bid)}/ai/voice-parse`, d),
  getLoanReadiness: (bid) => api.get(`${b(bid)}/ai/loan-readiness`),
  getPassport: (bid) => api.get(`${b(bid)}/ai/passport`),
};

export const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const communityApi = {
  createPost: (d) => api.post('/community/posts', d),
  getPosts: (params) => api.get('/community/posts', { params }),
  likePost: (id) => api.post(`/community/posts/${id}/like`),
  addComment: (id, d) => api.post(`/community/posts/${id}/comments`, d),
};

export const groupApi = {
  create: (d) => api.post('/groups', d),
  getAll: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  join: (id) => api.post(`/groups/${id}/join`),
  recordContribution: (id, d) => api.post(`${id}/contribution`, d),
};

export const loanApi = {
  getLenders: (bid, params) => api.get(`${b(bid)}/loans/lenders`, { params }),
  apply: (bid, d) => api.post(`${b(bid)}/loans/apply`, d),
  getApplications: (bid) => api.get(`${b(bid)}/loans/applications`),
};

export const marketApi = {
  getPrices: (params) => api.get('/market/prices', { params }),
  getTrends: () => api.get('/market/trends'),
};
