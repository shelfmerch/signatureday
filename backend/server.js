import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import mongoose from 'mongoose';
import compression from 'compression';
import passport from 'passport';
import cookieParser from 'cookie-parser';

// Routes
import userRoutes from './routes/userRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import shippingQuoteRoutes from './routes/shippingQuoteRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import ambassadorRoutes from './routes/ambassadorRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import renderRoutes from './routes/renderRoutes.js';

// Passport config
import { configurePassport } from './config/passport.js';
import User from './models/userModel.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000; // Changed to 4000 to avoid conflict

// Middleware
// CORS configuration
app.use(cors({
  origin: [
    "http://signaturedaytshirt.com",
    "https://signaturedaytshirt.com",
    "http://www.signaturedaytshirt.com",
    "https://www.signaturedaytshirt.com",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-render-token']
}));

// Allow preflight requests
app.options('*', cors());

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// Increase Node.js memory limits for handling large payloads
const maxRequestSize = '10mb'; // Reduced from 50mb to avoid memory issues
app.use(express.json({ limit: maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: maxRequestSize }));

// Cookie parser for referral cookies
app.use(cookieParser());

// Add compression to reduce payload sizes
app.use(compression());

// Add timeout handling
app.use((req, res, next) => {
  res.setTimeout(60000, () => {
    console.log('Request has timed out.');
    res.status(408).send('Request timeout');
  });
  next();
});

app.use(morgan('dev'));

// Request logging middleware for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.path}`);
  }
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/signatureday')
  .then(async () => {
    console.log('MongoDB connected successfully');
    // Ensure an admin user exists
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_NAME || 'Administrator';

      if (adminEmail && adminPassword) {
        let admin = await User.findOne({ email: adminEmail });
        if (!admin) {
          admin = await User.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            isAdmin: true,
            isLeader: true
          });
          console.log(`Admin user created: ${adminEmail}`);
        } else if (!admin.isAdmin) {
          admin.isAdmin = true;
          await admin.save();
          console.log(`Existing user promoted to admin: ${adminEmail}`);
        }
      } else {
        console.warn('ADMIN_EMAIL and/or ADMIN_PASSWORD not set. Skipping admin seeding.');
      }
    } catch (seedErr) {
      console.error('Failed to ensure admin user:', seedErr);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes - Order matters: more specific routes should come before general ones
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/ambassadors', ambassadorRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/render', renderRoutes);
// Shipping routes mounted at /api (more general, should come last)
app.use('/api', shippingQuoteRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok', timestamp: new Date(),
    database: 'connected', message: 'Server is running'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.error(`[404] API route not found: ${req.method} ${req.originalUrl}`);
  console.error(`[404] Available routes: /api/users, /api/groups, /api/orders, /api/payments, /api/auth, /api/otp, /api/shipping-quote, /api/ambassadors, /api/referrals, /api/rewards, /api/admin`);
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    message: `The requested API endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
