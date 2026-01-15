const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
    console.log(`${statusColor} [${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/login-service';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const LOGIN_SERVICE_URL = process.env.LOGIN_SERVICE_URL || 'http://login-service:3001';

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Blacklisted tokens schema
const blacklistedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  tokenType: { type: String, enum: ['access', 'refresh'], default: 'access' },
  userId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  blacklistedAt: { type: Date, default: Date.now },
  reason: { type: String, enum: ['logout', 'logout-all', 'manual'], default: 'logout' }
});

// TTL index for automatic cleanup
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlacklistedToken = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

// Check login service dependency
async function checkLoginServiceHealth() {
  try {
    const response = await axios.get(`${LOGIN_SERVICE_URL}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.log(`⚠️  Login service not available: ${error.message}`);
    return false;
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const loginServiceHealthy = await checkLoginServiceHealth();

  res.json({
    success: true,
    message: 'Logout Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'logout-service',
    version: '1.0.0',
    dependencies: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      loginService: loginServiceHealthy ? 'healthy' : 'unavailable'
    }
  });
});

// Token validation middleware
const validateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Check if token is blacklisted
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Logout endpoint (invalidates current token)
app.post('/api/logout', validateToken, async (req, res) => {
  try {
    const { token, user } = req;

    // Calculate token expiry (24h from now for safety)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Add token to blacklist
    const blacklistedToken = new BlacklistedToken({
      token,
      tokenType: 'access',
      userId: user.userId,
      expiresAt,
      reason: 'logout'
    });

    await blacklistedToken.save();

    console.log(`🔒 User ${user.email} logged out, token blacklisted`);

    res.json({
      success: true,
      message: 'Logout successful - token invalidated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout from all devices
app.post('/api/logout-all', validateToken, async (req, res) => {
  try {
    const { user } = req;

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    // Find all existing tokens for this user and mark them as blacklisted
    // In a real app, we'd maintain a list of all active tokens
    // For demo, we'll just blacklist the current token
    const blacklistedToken = new BlacklistedToken({
      token: req.token,
      tokenType: 'access',
      userId: user.userId,
      expiresAt,
      reason: 'logout-all'
    });

    await blacklistedToken.save();

    console.log(`🔒 User ${user.email} logged out from all devices`);

    res.json({
      success: true,
      message: 'Logout from all devices successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Logout-all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if token is blacklisted (for other services to verify)
app.get('/api/check-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const blacklisted = await BlacklistedToken.findOne({ token });

    res.json({
      token,
      blacklisted: !!blacklisted,
      blacklistedAt: blacklisted?.blacklistedAt || null,
      reason: blacklisted?.reason || null
    });

  } catch (error) {
    console.error('Token check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active sessions for a user
app.get('/api/sessions', validateToken, async (req, res) => {
  try {
    const { user } = req;

    // Get blacklisted tokens for this user
    const blacklistedTokens = await BlacklistedToken.find({ userId: user.userId })
      .sort({ blacklistedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      user: { id: user.userId, email: user.email },
      blacklistedTokens: blacklistedTokens.map(t => ({
        reason: t.reason,
        blacklistedAt: t.blacklistedAt,
        tokenType: t.tokenType
      }))
    });

  } catch (error) {
    console.error('Sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual token invalidation (admin endpoint)
app.post('/api/invalidate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify token to get user info
    const decoded = jwt.verify(token, JWT_SECRET);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const blacklistedToken = new BlacklistedToken({
      token,
      tokenType: 'access',
      userId: decoded.userId,
      expiresAt,
      reason: 'manual'
    });

    await blacklistedToken.save();

    res.json({
      success: true,
      message: 'Token invalidated manually'
    });

  } catch (error) {
    console.error('Manual invalidation error:', error);
    res.status(500).json({ error: 'Failed to invalidate token' });
  }
});

// Service info endpoint
app.get('/api/info', async (req, res) => {
  const loginServiceHealthy = await checkLoginServiceHealth();

  res.json({
    service: 'logout-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    dependencies: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      loginService: {
        url: LOGIN_SERVICE_URL,
        healthy: loginServiceHealthy
      }
    },
    endpoints: [
      'GET /health',
      'POST /api/logout',
      'POST /api/logout-all',
      'GET /api/check-token/:token',
      'GET /api/sessions',
      'POST /api/invalidate-token',
      'GET /api/info'
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service - Logout Service',
    health: '/health',
    info: '/api/info',
    note: 'This service depends on login-service for user authentication'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Logout Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Service info: http://localhost:${PORT}/api/info`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Login Service URL: ${LOGIN_SERVICE_URL}`);
});