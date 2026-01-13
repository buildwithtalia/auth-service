const User = require('../../../shared/models/User');
const { verifyAccessToken, extractTokenFromHeader } = require('../../../shared/utils/jwt');
const BlacklistedToken = require('../models/BlacklistedToken');

/**
 * Logout Controller
 * Handles user logout, token invalidation, and session management
 */

/**
 * Logout user and invalidate refresh token
 * @route POST /api/logout
 * @access Private
 */
const logout = async (req, res) => {
  try {
    const accessToken = extractTokenFromHeader(req);
    const refreshToken = req.cookies.refreshToken;

    // Blacklist the access token
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      await BlacklistedToken.create({
        token: accessToken,
        tokenType: 'access',
        userId: decoded.userId,
        expiresAt: new Date(decoded.exp * 1000)
      });
    }

    // Remove refresh token from user's refresh tokens if present
    if (refreshToken && req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        await user.removeRefreshToken(refreshToken);
      }

      // Also blacklist the refresh token
      try {
        const { verifyRefreshToken } = require('../../../shared/utils/jwt');
        const decodedRefresh = verifyRefreshToken(refreshToken);
        await BlacklistedToken.create({
          token: refreshToken,
          tokenType: 'refresh',
          userId: decodedRefresh.userId,
          expiresAt: new Date(decodedRefresh.exp * 1000)
        });
      } catch (error) {
        // If refresh token is invalid, just continue
        console.warn('Invalid refresh token during logout:', error.message);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);

    // Even if there's an error, still clear the cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Logout user from all devices
 * @route POST /api/logout-all
 * @access Private
 */
const logoutAll = async (req, res) => {
  try {
    const accessToken = extractTokenFromHeader(req);

    // Blacklist the current access token
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      await BlacklistedToken.create({
        token: accessToken,
        tokenType: 'access',
        userId: decoded.userId,
        expiresAt: new Date(decoded.exp * 1000)
      });
    }

    // Find user and get all refresh tokens
    const user = await User.findById(req.user.id);
    if (user) {
      // Blacklist all refresh tokens
      for (const tokenData of user.refreshTokens) {
        try {
          const { verifyRefreshToken } = require('../../../shared/utils/jwt');
          const decoded = verifyRefreshToken(tokenData.token);
          await BlacklistedToken.create({
            token: tokenData.token,
            tokenType: 'refresh',
            userId: decoded.userId,
            expiresAt: new Date(decoded.exp * 1000)
          });
        } catch (error) {
          // If token is invalid, skip it
          console.warn('Invalid refresh token during logout-all:', error.message);
        }
      }

      // Remove all refresh tokens from user
      await user.removeAllRefreshTokens();
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);

    // Even if there's an error, still clear the cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Invalidate a specific token
 * @route POST /api/invalidate-token
 * @access Private
 */
const invalidateToken = async (req, res) => {
  try {
    const { token, tokenType } = req.body;

    if (!token || !tokenType) {
      return res.status(400).json({
        success: false,
        message: 'Token and token type are required',
        error: 'MISSING_PARAMETERS'
      });
    }

    if (!['access', 'refresh'].includes(tokenType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type. Must be "access" or "refresh"',
        error: 'INVALID_TOKEN_TYPE'
      });
    }

    // Verify and decode the token to get expiration
    let decoded;
    try {
      if (tokenType === 'access') {
        decoded = verifyAccessToken(token);
      } else {
        const { verifyRefreshToken } = require('../../../shared/utils/jwt');
        decoded = verifyRefreshToken(token);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token is already blacklisted
    const existingBlacklist = await BlacklistedToken.findOne({ token });
    if (existingBlacklist) {
      return res.status(409).json({
        success: false,
        message: 'Token is already invalidated',
        error: 'TOKEN_ALREADY_BLACKLISTED'
      });
    }

    // Blacklist the token
    await BlacklistedToken.create({
      token,
      tokenType,
      userId: decoded.userId,
      expiresAt: new Date(decoded.exp * 1000)
    });

    // If it's a refresh token, also remove it from user's refresh tokens
    if (tokenType === 'refresh') {
      const user = await User.findById(decoded.userId);
      if (user) {
        await user.removeRefreshToken(token);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Token invalidated successfully'
    });

  } catch (error) {
    console.error('Token invalidation error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Check if a token is blacklisted
 * @route GET /api/check-token/:token
 * @access Private (Service-to-service)
 */
const checkToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
        error: 'MISSING_TOKEN'
      });
    }

    // Check if token is blacklisted
    const blacklistedToken = await BlacklistedToken.findOne({ token });

    res.status(200).json({
      success: true,
      data: {
        isBlacklisted: !!blacklistedToken,
        blacklistedAt: blacklistedToken?.createdAt || null
      }
    });

  } catch (error) {
    console.error('Token check error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get user's active sessions (for future use)
 * @route GET /api/sessions
 * @access Private
 */
const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Get active refresh tokens (not blacklisted)
    const activeSessions = [];

    for (const tokenData of user.refreshTokens) {
      const isBlacklisted = await BlacklistedToken.findOne({ token: tokenData.token });

      if (!isBlacklisted) {
        try {
          const { verifyRefreshToken } = require('../../../shared/utils/jwt');
          const decoded = verifyRefreshToken(tokenData.token);

          activeSessions.push({
            tokenId: decoded.tokenId,
            createdAt: tokenData.createdAt,
            expiresAt: new Date(decoded.exp * 1000),
            isActive: true
          });
        } catch (error) {
          // Token is expired or invalid, but not blacklisted - remove it
          await user.removeRefreshToken(tokenData.token);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        activeSessions,
        totalSessions: activeSessions.length
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Clean up expired blacklisted tokens (maintenance endpoint)
 * @route POST /api/cleanup-tokens
 * @access Private (Admin/Service)
 */
const cleanupTokens = async (req, res) => {
  try {
    const now = new Date();

    // Remove expired blacklisted tokens
    const result = await BlacklistedToken.deleteMany({
      expiresAt: { $lte: now }
    });

    res.status(200).json({
      success: true,
      message: 'Token cleanup completed',
      data: {
        removedTokens: result.deletedCount,
        cleanupTime: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Token cleanup error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  logout,
  logoutAll,
  invalidateToken,
  checkToken,
  getSessions,
  cleanupTokens
};