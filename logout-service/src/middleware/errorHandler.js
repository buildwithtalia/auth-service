/**
 * Centralized error handling middleware
 */

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', errorCode = 'AUTH_FAILED') {
    super(message, 401, errorCode);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', errorCode = 'INSUFFICIENT_PERMISSIONS') {
    super(message, 403, errorCode);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', errorCode = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, errorCode);
  }
}

/**
 * Development error response
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.errorCode || 'SERVER_ERROR',
    message: err.message,
    stack: err.stack,
    ...(err.errors && { errors: err.errors })
  });
};

/**
 * Production error response
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode || 'CLIENT_ERROR',
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR:', err);

    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Something went wrong'
    });
  }
};

/**
 * Handle Mongoose validation errors
 * @param {Error} err - Mongoose validation error
 * @returns {ValidationError} - Custom validation error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => ({
    field: val.path,
    message: val.message,
    value: val.value
  }));

  return new ValidationError('Validation failed', errors);
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} err - Mongoose duplicate key error
 * @returns {ConflictError} - Custom conflict error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return new ConflictError(
    `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`,
    'DUPLICATE_FIELD'
  );
};

/**
 * Handle Mongoose cast errors
 * @param {Error} err - Mongoose cast error
 * @returns {ValidationError} - Custom validation error
 */
const handleCastError = (err) => {
  return new ValidationError(
    `Invalid ${err.path}: ${err.value}`,
    [{
      field: err.path,
      message: `Invalid ${err.path}`,
      value: err.value
    }]
  );
};

/**
 * Handle JWT errors
 * @param {Error} err - JWT error
 * @returns {AuthenticationError} - Custom authentication error
 */
const handleJWTError = () => {
  return new AuthenticationError('Invalid token', 'INVALID_TOKEN');
};

/**
 * Handle JWT expired errors
 * @param {Error} err - JWT expired error
 * @returns {AuthenticationError} - Custom authentication error
 */
const handleJWTExpiredError = () => {
  return new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }

  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Handle async errors
 * @param {Function} fn - Async function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  globalErrorHandler,
  asyncHandler,
  notFound
};