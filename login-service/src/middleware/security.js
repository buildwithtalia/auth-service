const rateLimit = require('express-rate-limit');
const { config } = require('../config/config');

/**
 * Security middleware functions
 */

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

/**
 * Authentication rate limiter
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    error: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.rateLimit.auth.skipSuccessfulRequests,
  skipFailedRequests: config.rateLimit.auth.skipFailedRequests,
  keyGenerator: (req) => {
    // Use email if provided for more specific rate limiting
    return req.body?.email || req.ip;
  }
});

/**
 * Registration rate limiter
 */
const registerLimiter = rateLimit({
  windowMs: config.rateLimit.register.windowMs,
  max: config.rateLimit.register.max,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
    error: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.rateLimit.register.skipSuccessfulRequests
});

/**
 * Password reset rate limiter (for future use)
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later',
    error: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxBytes = parseSize(maxSize);

      if (size > maxBytes) {
        return res.status(413).json({
          success: false,
          message: 'Request entity too large',
          error: 'REQUEST_TOO_LARGE'
        });
      }
    }

    next();
  };
};

/**
 * Convert size string to bytes
 * @param {string} size - Size string (e.g., '10mb', '1gb')
 * @returns {number} - Size in bytes
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * (units[unit] || 1));
};

/**
 * Sanitize headers middleware
 */
const sanitizeHeaders = (req, res, next) => {
  // Remove potentially dangerous headers
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-forwarded-server'];

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'REQUEST_TIMEOUT'
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
};

/**
 * IP filtering middleware
 */
const ipFilter = (allowedIPs = [], blockedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;

    // Check if IP is blocked
    if (blockedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'IP_BLOCKED'
      });
    }

    // Check if IP is in allowed list (if list exists)
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'IP_NOT_ALLOWED'
      });
    }

    next();
  };
};

/**
 * User-Agent validation middleware
 */
const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    return res.status(400).json({
      success: false,
      message: 'User-Agent header is required',
      error: 'MISSING_USER_AGENT'
    });
  }

  // Block suspicious or bot user agents
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious && config.app.env === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'SUSPICIOUS_USER_AGENT'
    });
  }

  next();
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('Request Error:', logData);
    } else if (res.statusCode >= 400) {
      console.warn('Request Warning:', logData);
    } else if (config.app.env === 'development') {
      console.log('Request Info:', logData);
    }
  });

  next();
};

/**
 * API key validation middleware (for future use)
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required',
      error: 'MISSING_API_KEY'
    });
  }

  // Validate API key against database or environment variable
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
      error: 'INVALID_API_KEY'
    });
  }

  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  requestSizeLimiter,
  sanitizeHeaders,
  requestTimeout,
  ipFilter,
  validateUserAgent,
  requestLogger,
  validateApiKey
};