require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import middleware
const { globalErrorHandler, notFound } = require('./src/middleware/errorHandler');

// Import routes
const logoutRoutes = require('./src/routes/logout');

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN ?
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) :
      ['http://localhost:3000', 'http://localhost:3001']; // Include login service

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', logoutRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Logout Service API',
    version: '1.0.0',
    service: 'logout',
    endpoints: [
      'POST /api/logout - Logout user',
      'POST /api/logout-all - Logout from all devices',
      'POST /api/invalidate-token - Invalidate specific token',
      'GET /api/check-token/:token - Check if token is blacklisted',
      'GET /api/sessions - Get active sessions',
      'POST /api/cleanup-tokens - Clean expired tokens'
    ]
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Global error handling middleware
app.use(globalErrorHandler);

/**
 * Database connection
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/login-service';

    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${connection.connection.host}`);

    // Log database events
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB Disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB Error:', err);
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    const PORT = process.env.PORT || 3002;

    const server = app.listen(PORT, () => {
      console.log(`
╭─────────────────────────────────────────╮
│  🔓 Logout Service Started             │
│                                         │
│  Environment: ${(process.env.NODE_ENV || 'development').toUpperCase().padEnd(12)} │
│  Port:        ${PORT.toString().padEnd(12)} │
│  URL:         http://localhost:${PORT.toString().padEnd(4)} │
│                                         │
│  Endpoints:                             │
│  • POST /api/logout                    │
│  • POST /api/logout-all                │
│  • POST /api/invalidate-token          │
│  • GET  /api/check-token/:token        │
│  • GET  /api/sessions                  │
│  • POST /api/cleanup-tokens            │
│                                         │
│  Health Check: /health                  │
╰─────────────────────────────────────────╯
      `);
    });

    // Schedule periodic cleanup of expired tokens
    if (process.env.NODE_ENV !== 'test') {
      const BlacklistedToken = require('./src/models/BlacklistedToken');

      setInterval(async () => {
        try {
          const deletedCount = await BlacklistedToken.cleanupExpired();
          if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} expired blacklisted tokens`);
          }
        } catch (error) {
          console.error('Error cleaning up expired tokens:', error);
        }
      }, 60 * 60 * 1000); // Run every hour
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', err);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;