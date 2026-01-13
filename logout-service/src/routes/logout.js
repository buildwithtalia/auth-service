const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

const logoutController = require('../controllers/logoutController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for logout endpoints
const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 logout attempts per window
  message: {
    success: false,
    message: 'Too many logout attempts, please try again later',
    error: 'LOGOUT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Rate limiting for admin/service endpoints
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour for admin endpoints
  message: {
    success: false,
    message: 'Too many admin requests, please try again later',
    error: 'ADMIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const invalidateTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 20 })
    .withMessage('Invalid token format'),

  body('tokenType')
    .isIn(['access', 'refresh'])
    .withMessage('Token type must be "access" or "refresh"')
];

const tokenParamValidation = [
  param('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 20 })
    .withMessage('Invalid token format')
];

// Routes

/**
 * @route   POST /api/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
router.post('/logout',
  logoutLimiter,
  optionalAuth, // Optional because even invalid tokens should be able to logout
  logoutController.logout
);

/**
 * @route   POST /api/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post('/logout-all',
  logoutLimiter,
  authenticateToken,
  logoutController.logoutAll
);

/**
 * @route   POST /api/invalidate-token
 * @desc    Manually invalidate a specific token
 * @access  Private
 */
router.post('/invalidate-token',
  logoutLimiter,
  authenticateToken,
  invalidateTokenValidation,
  logoutController.invalidateToken
);

/**
 * @route   GET /api/check-token/:token
 * @desc    Check if a token is blacklisted (service-to-service)
 * @access  Private (should be protected by API key in production)
 */
router.get('/check-token/:token',
  adminLimiter,
  tokenParamValidation,
  logoutController.checkToken
);

/**
 * @route   GET /api/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions',
  authenticateToken,
  logoutController.getSessions
);

/**
 * @route   POST /api/cleanup-tokens
 * @desc    Clean up expired blacklisted tokens (maintenance)
 * @access  Private (Admin/Service)
 */
router.post('/cleanup-tokens',
  adminLimiter,
  // In production, this should require admin authentication or API key
  logoutController.cleanupTokens
);

module.exports = router;