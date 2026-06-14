require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const posRoutes = require('./routes/posRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const {
  customerRouter, debtRouter, analyticsRouter,
  resourceRouter, aiRouter, notifRouter,
  communityRouter, groupRouter, adminRouter,
} = require('./routes/allRoutes');
const {
  agentRouter, assocRouter, loanRouter, loanAdminRouter,
  marketRouter, learningRouter, fraudRouter, verifyRouter,
} = require('./routes/moduleRoutes');

connectDB();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://street-os-web.vercel.app',
  'http://localhost:5173',
].filter(Boolean)

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

app.set('io', io);

// Security
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Core Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses/:businessId/transactions', transactionRoutes);
app.use('/api/businesses/:businessId/products', productRoutes);
app.use('/api/businesses/:businessId/inventory', inventoryRoutes);
app.use('/api/businesses/:businessId/sales', posRoutes);
app.use('/api/businesses/:businessId/purchase-orders', purchaseOrderRoutes);
app.use('/api/businesses/:businessId/customers', customerRouter);
app.use('/api/businesses/:businessId/debts', debtRouter);
app.use('/api/businesses/:businessId/analytics', analyticsRouter);
app.use('/api/businesses/:businessId', resourceRouter);
app.use('/api/businesses/:businessId/ai', aiRouter);
app.use('/api/businesses/:businessId/loans', loanRouter);
app.use('/api/businesses/:businessId/market', marketRouter);
app.use('/api/businesses/:businessId/security', fraudRouter);
app.use('/api/businesses/:businessId/verification', verifyRouter);

// Platform-wide Routes
app.use('/api/notifications', notifRouter);
app.use('/api/community', communityRouter);
app.use('/api/groups', groupRouter);
app.use('/api/agents', agentRouter);
app.use('/api/associations', assocRouter);
app.use('/api/market', marketRouter);
app.use('/api/learning', learningRouter);
app.use('/api/loans/admin', loanAdminRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => res.json({ status: 'OK', service: 'StreetOS API', timestamp: new Date() }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`StreetOS AI API running on port ${PORT} [${process.env.NODE_ENV}]`));

module.exports = { app, io };
