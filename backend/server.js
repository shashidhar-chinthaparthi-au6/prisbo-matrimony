import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import interestRoutes from './routes/interestRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import adminSubscriptionRoutes from './routes/adminSubscriptionRoutes.js';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Handle preflight requests explicitly (additional safety)
app.options('*', cors(corsOptions));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure database connection before API routes (except health check)
app.use('/api', ensureDBConnection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminSubscriptionRoutes);

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
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
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
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
// @vercel/node automatically wraps Express apps
export default app;

