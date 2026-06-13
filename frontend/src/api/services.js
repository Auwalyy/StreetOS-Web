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

// PRODUCTS
export const productApi = {
  create: (bid, d) => api.post(`${b(bid)}/products`, d),
  getAll: (bid, params) => api.get(`${b(bid)}/products`, { params }),
  get: (bid, id) => api.get(`${b(bid)}/products/${id}`),
  update: (bid, id, d) => api.put(`${b(bid)}/products/${id}`, d),
  delete: (bid, id) => api.delete(`${b(bid)}/products/${id}`),
  adjustStock: (bid, id, d) => api.post(`${b(bid)}/products/${id}/adjust-stock`, d),
  getLowStock: (bid) => api.get(`${b(bid)}/products/low-stock`),
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

// SAVINGS
export const savingsApi = {
  create: (bid, d) => api.post(`${b(bid)}/savings`, d),
  getAll: (bid) => api.get(`${b(bid)}/savings`),
  addTransaction: (bid, id, d) => api.post(`${b(bid)}/savings/${id}/transaction`, d),
}

// GOALS
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

// ADMIN
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, d) => api.put(`/admin/users/${id}`, d),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getBusinesses: (params) => api.get('/admin/businesses', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
}
