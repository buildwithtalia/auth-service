const { body, param, query } = require('express-validator');

/**
 * Common validation rules and utilities
 */

/**
 * Email validation rule
 */
const emailValidation = () => {
  return body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ min: 5, max: 254 })
    .withMessage('Email must be between 5 and 254 characters');
};

/**
 * Strong password validation rule
 */
const strongPasswordValidation = () => {
  return body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)');
};

/**
 * Basic password validation rule (for login)
 */
const passwordValidation = () => {
  return body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters');
};

/**
 * MongoDB ObjectId validation rule
 */
const mongoIdValidation = (paramName = 'id') => {
  return param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`);
};

/**
 * Validate request body fields
 */
const validateFields = (allowedFields) => {
  return (req, res, next) => {
    const bodyFields = Object.keys(req.body);
    const invalidFields = bodyFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields in request',
        errors: invalidFields.map(field => ({
          field,
          message: `Field '${field}' is not allowed`
        })),
        error: 'INVALID_FIELDS'
      });
    }

    next();
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input, options = {}) => {
  const {
    trim = true,
    lowercase = false,
    removeSpecialChars = false,
    maxLength = null
  } = options;

  let sanitized = String(input || '');

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (lowercase) {
    sanitized = sanitized.toLowerCase();
  }

  if (removeSpecialChars) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate phone number (basic international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date format (ISO 8601)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid date
 */
const isValidDate = (date) => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && date === parsedDate.toISOString();
};

/**
 * Pagination validation middleware
 */
const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),

    query('sort')
      .optional()
      .matches(/^[\w\-,\s]+$/)
      .withMessage('Invalid sort format')
  ];
};

/**
 * Search query validation middleware
 */
const validateSearch = () => {
  return [
    query('q')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim()
      .escape()
  ];
};

/**
 * Rate limiting key generator
 * @param {Object} req - Express request object
 * @returns {string} - Rate limiting key
 */
const getRateLimitKey = (req) => {
  const userId = req.user ? req.user.id : null;
  const ip = req.ip;

  return userId ? `user:${userId}` : `ip:${ip}`;
};

module.exports = {
  emailValidation,
  strongPasswordValidation,
  passwordValidation,
  mongoIdValidation,
  validateFields,
  validatePagination,
  validateSearch,
  sanitizeString,
  isValidEmail,
  validatePassword,
  isValidObjectId,
  isValidUrl,
  isValidPhone,
  isValidDate,
  getRateLimitKey
};