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

// Load env vars
dotenv.config();

// Connect to database (with error handling for serverless)
// Don't block server startup - connect in background
let dbConnected = false;
const connectDatabase = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection error:', error.message);
      // Don't exit - allow server to run without DB for health checks
      // Routes that need DB will handle the error
    }
  }
};

// Connect to database in background (non-blocking)
connectDatabase().catch(err => {
  console.error('Failed to connect to database:', err.message);
});

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check (works even if DB is not connected)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Prisbo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS: Origin not allowed',
      origin: req.headers.origin,
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
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

