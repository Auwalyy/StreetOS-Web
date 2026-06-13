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
const {
  customerRouter, debtRouter, analyticsRouter,
  resourceRouter, aiRouter, notifRouter,
  communityRouter, groupRouter, adminRouter,
} = require('./routes/allRoutes');

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

app.set('io', io);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses/:businessId/transactions', transactionRoutes);
app.use('/api/businesses/:businessId/products', productRoutes);
app.use('/api/businesses/:businessId/customers', customerRouter);
app.use('/api/businesses/:businessId/debts', debtRouter);
app.use('/api/businesses/:businessId/analytics', analyticsRouter);
app.use('/api/businesses/:businessId', resourceRouter);
app.use('/api/businesses/:businessId/ai', aiRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/community', communityRouter);
app.use('/api/groups', groupRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`StreetOS API running on port ${PORT}`));

module.exports = { app, io };
