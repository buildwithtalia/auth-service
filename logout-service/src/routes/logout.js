const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

const logoutController = require('../controllers/logoutController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// All rate limiting removed for unlimited requests

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
  optionalAuth, // Optional because even invalid tokens should be able to logout
  logoutController.logout
);

/**
 * @route   POST /api/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post('/logout-all',
  authenticateToken,
  logoutController.logoutAll
);

/**
 * @route   POST /api/invalidate-token
 * @desc    Manually invalidate a specific token
 * @access  Private
 */
router.post('/invalidate-token',
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
  // In production, this should require admin authentication or API key
  logoutController.cleanupTokens
);

module.exports = router;