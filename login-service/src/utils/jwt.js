const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT utility functions for token management
 */

/**
 * Generate an access token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {string} - JWT access token
 */
const generateAccessToken = (payload) => {
  const { userId, email } = payload;

  return jwt.sign(
    {
      userId,
      email,
      type: 'access'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '24h',
      issuer: 'login-service',
      audience: 'client-app'
    }
  );
};

/**
 * Generate a refresh token
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
  const { userId } = payload;

  return jwt.sign(
    {
      userId,
      type: 'refresh',
      tokenId: crypto.randomUUID()
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      issuer: 'login-service',
      audience: 'client-app'
    }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @returns {Object} - Object containing both tokens
 */
const generateTokens = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify an access token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'login-service',
      audience: 'client-app'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'login-service',
      audience: 'client-app'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - Extracted token or null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Extract token from cookie
 * @param {Object} req - Express request object
 * @param {string} cookieName - Name of the cookie containing the token
 * @returns {string|null} - Extracted token or null
 */
const extractTokenFromCookie = (req, cookieName = 'refreshToken') => {
  return req.cookies[cookieName] || null;
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Check if token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Date.now() / 1000;
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration date
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Get time until token expires in seconds
 * @param {string} token - JWT token
 * @returns {number|null} - Seconds until expiration or null
 */
const getTimeUntilExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    const now = Date.now() / 1000;
    const timeUntil = decoded.exp - now;

    return Math.max(0, Math.floor(timeUntil));
  } catch (error) {
    return null;
  }
};

/**
 * Generate a secure random token for additional security
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Random hex token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  extractTokenFromCookie,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTimeUntilExpiration,
  generateSecureToken
};