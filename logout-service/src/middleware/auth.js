const { verifyAccessToken, extractTokenFromHeader } = require('../../../shared/utils/jwt');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');

/**
 * Authentication middleware functions
 */

/**
 * Middleware to authenticate and authorize requests
 * Requires valid JWT token in Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
    }

    // Verify the token
    const decoded = verifyAccessToken(token);

    // Check if token is the correct type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        error: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated',
        error: 'TOKEN_BLACKLISTED'
      });
    }

    // Find the user
    const mongoose = require('mongoose');
    const user = await User.findById(new mongoose.Types.ObjectId(decoded.userId));

    const finalUser = user;

    if (!finalUser) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    if (!finalUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        error: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Attach user to request object
    req.user = {
      id: finalUser._id,
      email: finalUser.email,
      isActive: finalUser.isActive,
      lastLogin: finalUser.lastLogin,
      createdAt: finalUser.createdAt
    };

    next();
  } catch (error) {
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.message.includes('invalid') || error.message.includes('malformed')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_FAILED'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if valid token is provided, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'access') {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If there's an error with optional auth, just continue without user
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user is authenticated
 * Use this after optionalAuth to require authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTH_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware to check if user account is active
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireActiveUser = (req, res, next) => {
  if (!req.user || !req.user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is not active',
      error: 'ACCOUNT_INACTIVE'
    });
  }

  next();
};

/**
 * Middleware factory to check user roles (for future extensibility)
 * @param {string|Array} allowedRoles - Role(s) allowed to access the route
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTH_REQUIRED'
      });
    }

    // Convert single role to array for consistency
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // For now, assuming all users have 'user' role
    // This can be extended when role system is implemented
    const userRoles = req.user.roles || ['user'];

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is the owner of the resource
 * @param {string} paramName - Name of the parameter containing user ID
 * @returns {Function} - Express middleware function
 */
const requireOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTH_REQUIRED'
      });
    }

    const resourceUserId = req.params[paramName];

    if (req.user.id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: insufficient permissions',
        error: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware to attach rate limiting info to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const attachRateLimitInfo = (req, res, next) => {
  req.rateLimitInfo = {
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  };

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAuth,
  requireActiveUser,
  requireRole,
  requireOwnership,
  attachRateLimitInfo
};