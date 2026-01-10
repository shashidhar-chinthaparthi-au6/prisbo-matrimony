import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Check if user is blocked
    if (req.user.isActive === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been blocked. Please contact support.',
        accountBlocked: true 
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
};

export const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as super admin' });
  }
};

export const vendor = (req, res, next) => {
  if (req.user && req.user.role === 'vendor') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as vendor' });
  }
};

export const vendorOrSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'vendor' || req.user.role === 'super_admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as vendor or super admin' });
  }
};

// Check if user has accepted terms and conditions
// This middleware should be used after protect middleware
export const checkTermsAccepted = (req, res, next) => {
  // Skip terms check for terms-related endpoints
  if (req.path.includes('/terms/current') || req.path.includes('/terms/accept')) {
    return next();
  }

  // Skip terms check for super_admin (they don't need to accept)
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  // Check if terms are accepted
  if (req.user && !req.user.termsAccepted) {
    return res.status(403).json({
      success: false,
      message: 'Please accept terms and conditions to continue',
      requiresTermsAcceptance: true,
    });
  }

  next();
};

