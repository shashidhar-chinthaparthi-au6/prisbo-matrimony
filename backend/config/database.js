import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (cached.promise) {
    return cached.promise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
  }

  // Create new connection promise
  // Use bufferCommands: true for serverless to allow commands to queue
  cached.promise = mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: true, // Allow commands to buffer while connecting
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }).then((conn) => {
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    cached.conn = conn;
    return conn;
  }).catch((error) => {
    cached.promise = null;
    console.error(`MongoDB connection error: ${error.message}`);
    // Don't exit in serverless environment
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  });

  return cached.promise;
};

export default connectDB;

