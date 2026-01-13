import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';
import { securityHeaders, xssProtection, requestSizeLimiter } from './middleware/security.js';
import { generalLimiter, authLimiter, uploadLimiter, searchLimiter, adminLimiter, chatLimiter, notificationLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import interestRoutes from './routes/interestRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import adminSubscriptionRoutes from './routes/adminSubscriptionRoutes.js';
import termsRoutes from './routes/termsRoutes.js';

// Load env vars
dotenv.config();

// Connect to database (with error handling for serverless)
// For serverless, we need to ensure connection is ready before routes execute
let dbConnectionPromise = null;

const connectDatabase = async () => {
  // If already connected, return immediately
  const mongoose = await import('mongoose');
  if (mongoose.default.connection.readyState === 1) {
    return mongoose.default.connection;
  }
  
  // If connection is in progress, wait for it
  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }
  
  // Start new connection
  dbConnectionPromise = (async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectDB();
        console.log('Database connected successfully');
        return mongoose.default.connection;
      } else {
        throw new Error('MONGODB_URI not set');
      }
    } catch (error) {
      console.error('Database connection error:', error.message);
      dbConnectionPromise = null; // Allow retry
      throw error;
    }
  })();
  
  return dbConnectionPromise;
};

// Middleware to ensure database is connected before route handlers
const ensureDBConnection = async (req, res, next) => {
  // Skip DB check for health endpoint
  if (req.path === '/api/health') {
    return next();
  }
  
  try {
    // Ensure connection is ready
    const mongoose = await import('mongoose');
    
    // If already connected, proceed
    if (mongoose.default.connection.readyState === 1) {
      return next();
    }
    
    // If connecting, wait for it
    if (mongoose.default.connection.readyState === 2) {
      await new Promise((resolve, reject) => {
        mongoose.default.connection.once('connected', resolve);
        mongoose.default.connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      return next();
    }
    
    // If not connected, try to connect
    await connectDatabase();
    next();
  } catch (error) {
    console.error('Database connection required:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database connection unavailable. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Start connection in background (non-blocking for server startup)
if (process.env.MONGODB_URI) {
  connectDatabase().catch(err => {
    console.error('Failed to connect to database:', err.message);
  });
} else {
  console.warn('MONGODB_URI environment variable not set');
}

const app = express();

// CORS Configuration - Must be first middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Always allow any Vercel preview/deployment URL (covers all preview URLs)
    // This includes: *.vercel.app domains
    if (origin.includes('.vercel.app')) {
      console.log('CORS: Allowing Vercel origin:', origin);
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow specific origins from environment
    const allowedOrigins = [
      process.env.WEB_URL,
      process.env.MOBILE_URL,
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Log blocked origin for debugging
    console.log('CORS: Blocked origin:', origin);
    console.log('CORS: Allowed origins:', allowedOrigins);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// Handle preflight requests FIRST, before any other middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  // Check if origin should be allowed
  let allowed = false;
  if (!origin) {
    allowed = true;
  } else if (origin.includes('.vercel.app')) {
    allowed = true;
  } else if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    allowed = true;
  } else if (process.env.NODE_ENV === 'development') {
    allowed = true;
  } else {
    const allowedOrigins = [
      process.env.WEB_URL,
      process.env.MOBILE_URL,
    ].filter(Boolean);
    allowed = allowedOrigins.includes(origin);
  }
  
  if (allowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  
  res.status(403).json({ success: false, message: 'CORS: Origin not allowed' });
});

// Apply CORS middleware
app.use(cors(corsOptions));

// Security headers (helmet)
app.use(securityHeaders);

// Request size limiter
app.use(requestSizeLimiter);

// XSS protection
app.use(xssProtection);

// General rate limiting (applies to all routes)
app.use('/api', generalLimiter);

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure database connection before API routes (except health check)
app.use('/api', ensureDBConnection);

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/profiles', uploadLimiter, profileRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/chats', chatLimiter, chatRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/notifications', notificationLimiter, notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminLimiter, adminSubscriptionRoutes);
app.use('/api/terms', termsRoutes);

// Health check (works even if DB is not connected)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Prisbo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  // Set CORS headers on 404 responses
  const origin = req.headers.origin;
  if (origin && (origin.includes('.vercel.app') || 
                 origin.startsWith('http://localhost:') || 
                 origin.startsWith('http://127.0.0.1:') ||
                 process.env.NODE_ENV === 'development' ||
                 [process.env.WEB_URL, process.env.MOBILE_URL].filter(Boolean).includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Set CORS headers on error responses
  const origin = req.headers.origin;
  if (origin && (origin.includes('.vercel.app') || 
                 origin.startsWith('http://localhost:') || 
                 origin.startsWith('http://127.0.0.1:') ||
                 process.env.NODE_ENV === 'development' ||
                 [process.env.WEB_URL, process.env.MOBILE_URL].filter(Boolean).includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Don't log stack in production for security
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  } else {
    console.error('Error:', err.message);
  }
  
  // Handle CORS errors specifically
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS: Origin not allowed',
      origin: req.headers.origin,
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

// Only listen if not in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    
    // Start subscription expiry checks (run every 24 hours)
    const { checkAndSendExpiryWarnings, processAutoRenewals } = await import('./utils/subscriptionExpiry.js');
    const { checkAndExpireInterests } = await import('./utils/interestExpiry.js');
    
    // Run immediately on startup
    checkAndSendExpiryWarnings().catch(err => console.error('Error in initial expiry check:', err));
    processAutoRenewals().catch(err => console.error('Error in initial auto-renewal check:', err));
    checkAndExpireInterests().catch(err => console.error('Error in initial interest expiry check:', err));
    
    // Schedule daily checks (every 24 hours)
    setInterval(() => {
      checkAndSendExpiryWarnings().catch(err => console.error('Error in scheduled expiry check:', err));
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    setInterval(() => {
      processAutoRenewals().catch(err => console.error('Error in scheduled auto-renewal check:', err));
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // Check for expired interests every 6 hours
    setInterval(() => {
      checkAndExpireInterests().catch(err => console.error('Error in scheduled interest expiry check:', err));
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    console.log('Subscription expiry checks scheduled');
    console.log('Interest expiry checks scheduled');
  });
}

// Export for Vercel serverless functions
// @vercel/node automatically wraps Express apps
export default app;

