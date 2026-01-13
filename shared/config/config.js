/**
 * Application Configuration
 * Centralized configuration management with validation
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

/**
 * Validate required environment variables
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

/**
 * Configuration object
 */
const config = {
  // Application settings
  app: {
    name: 'Login Service',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/login-service',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: process.env.JWT_ISSUER || 'login-service',
    audience: process.env.JWT_AUDIENCE || 'client-app'
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    trustProxy: process.env.TRUST_PROXY === 'true' || false,

    // Session/Cookie configuration
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    },

    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    }
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 5, // 5 requests per window

    // Authentication specific rate limiting
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },

    // Registration specific rate limiting
    register: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registration attempts per hour
      skipSuccessfulRequests: false
    },

    // General API rate limiting
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window for authenticated users
      skipSuccessfulRequests: false
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      path: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs'),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_MAX_FILES || '5'
    }
  },

  // Email configuration (for future features)
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@login-service.com'
  },

  // Feature flags
  features: {
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
    twoFactorAuth: process.env.FEATURE_2FA === 'true',
    passwordReset: process.env.FEATURE_PASSWORD_RESET === 'true',
    socialLogin: process.env.FEATURE_SOCIAL_LOGIN === 'true'
  }
};

/**
 * Environment-specific configurations
 */
if (config.app.env === 'production') {
  // Production-specific settings
  config.security.cookie.secure = true;
  config.logging.level = 'warn';
  config.rateLimit.max = 3; // Stricter rate limiting in production
} else if (config.app.env === 'test') {
  // Test-specific settings
  config.database.uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/login-service-test';
  config.jwt.expiresIn = '1h';
  config.security.bcryptRounds = 4; // Faster hashing for tests
  config.rateLimit.max = 1000; // Relaxed rate limiting for tests
}

/**
 * Validate configuration
 */
const validateConfig = () => {
  const errors = [];

  // Validate JWT secrets
  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  if (config.jwt.refreshSecret.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }

  // Validate bcrypt rounds
  if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
    errors.push('BCRYPT_ROUNDS must be between 10 and 15');
  }

  // Validate port
  if (config.app.port < 1 || config.app.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    process.exit(1);
  }

  return true;
};

// Validate configuration on load
validateConfig();

/**
 * Get configuration for specific environment
 * @param {string} key - Configuration key (dot notation supported)
 * @returns {*} - Configuration value
 */
const get = (key) => {
  return key.split('.').reduce((obj, k) => obj?.[k], config);
};

/**
 * Check if we're in development mode
 * @returns {boolean} - True if in development
 */
const isDevelopment = () => {
  return config.app.env === 'development';
};

/**
 * Check if we're in production mode
 * @returns {boolean} - True if in production
 */
const isProduction = () => {
  return config.app.env === 'production';
};

/**
 * Check if we're in test mode
 * @returns {boolean} - True if in test
 */
const isTest = () => {
  return config.app.env === 'test';
};

module.exports = {
  config,
  get,
  isDevelopment,
  isProduction,
  isTest,
  validateConfig
};