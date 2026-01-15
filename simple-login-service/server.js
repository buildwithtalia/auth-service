const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Generate W3C Trace Context headers
function generateTraceContext() {
  // Generate 128-bit trace ID (32 hex characters)
  const traceId = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  // Generate 64-bit parent ID (16 hex characters)
  const parentId = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  // Trace flags: 01 means sampled
  const traceFlags = '01';

  return {
    traceparent: `00-${traceId}-${parentId}-${traceFlags}`,
    traceId,
    parentId
  };
}

// Extract trace context from incoming request
function extractTraceContext(req) {
  const traceparent = req.headers.traceparent;
  if (traceparent && traceparent.startsWith('00-')) {
    const parts = traceparent.split('-');
    if (parts.length === 4) {
      return {
        traceparent: traceparent,
        traceId: parts[1],
        parentId: parts[2],
        traceFlags: parts[3]
      };
    }
  }
  // Generate new trace context if none found
  return generateTraceContext();
}

// Generate child span for current request
function generateChildSpan(traceContext) {
  const childSpanId = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return {
    traceparent: `00-${traceContext.traceId}-${childSpanId}-01`,
    traceId: traceContext.traceId,
    parentId: traceContext.parentId,
    spanId: childSpanId,
    traceFlags: '01'
  };
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Extract or generate trace context
  const traceContext = extractTraceContext(req);

  // Generate child span for this request
  const currentSpan = generateChildSpan(traceContext);
  req.traceContext = currentSpan;

  // Add traceparent to response headers
  res.setHeader('traceparent', currentSpan.traceparent);

  // Helper function to add trace context to JSON responses
  const originalJson = res.json;
  res.json = function(body) {
    if (typeof body === 'object' && body !== null) {
      body.trace = {
        traceId: currentSpan.traceId,
        spanId: currentSpan.spanId,
        parentId: currentSpan.parentId
      };
    }
    return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
    const fromService = req.headers['user-agent']?.includes('logout-service') ? ' ← logout-service' : '';
    console.log(`${statusColor} [${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) [trace:${currentSpan.traceId.substring(0, 8)}:${currentSpan.spanId.substring(0, 8)}]${fromService}`);
  });

  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/login-service';
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Simple User Schema (no bcrypt for demo)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Plain text for demo only
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Login Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'login-service',
    version: '1.0.0'
  });
});

// Demo register endpoint (simplified)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user (plain password for demo)
    const user = new User({ email, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: user._id, email: user.email }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Demo login endpoint (simplified)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Simple password check (no bcrypt for demo)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile (with token validation)
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: { id: user._id, email: user.email, createdAt: user.createdAt }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Demo logout endpoint (simplified)
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful - token invalidated on client side'
  });
});

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    service: 'login-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/info'
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service - Login Service',
    health: '/health',
    info: '/api/info'
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
  console.log(`🚀 Login Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Service info: http://localhost:${PORT}/api/info`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});