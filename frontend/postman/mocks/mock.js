const http = require('http');
const url = require('url');

/**
 * Auth Service Local Mock Server
 * 
 * This mock server simulates the Login Service (port 3001) and Logout Service (port 3002)
 * for development and testing purposes without requiring MongoDB or the actual services.
 * 
 * Mocked Endpoints:
 * 
 * LOGIN SERVICE (Port 3001):
 * - GET  /health - Health check
 * - GET  / - Service info
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - User login
 * - GET  /api/auth/me - Get user profile (requires auth)
 * - POST /api/auth/refresh - Refresh access token
 * 
 * LOGOUT SERVICE (Port 3002):
 * - GET  /health - Health check
 * - GET  / - Service info
 * - POST /api/logout - Logout user
 * - POST /api/logout-all - Logout from all devices
 * - POST /api/invalidate-token - Invalidate specific token
 * - GET  /api/check-token/:token - Check if token is blacklisted
 * - GET  /api/sessions - Get active sessions
 * - POST /api/cleanup-tokens - Cleanup expired tokens
 */

// Mock data storage
const mockUsers = new Map();
const mockBlacklistedTokens = new Set();
const mockSessions = new Map();

// Helper functions
function generateMockToken(type = 'access') {
  const prefix = type === 'access' ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IlJlZnJlc2gifQ';
  const randomPart = Buffer.from(JSON.stringify({
    userId: Math.random().toString(36).substring(7),
    email: 'mock@example.com',
    type: type,
    exp: Math.floor(Date.now() / 1000) + (type === 'access' ? 86400 : 604800)
  })).toString('base64');
  const signature = Math.random().toString(36).substring(7);
  return `${prefix}.${randomPart}.${signature}`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end(JSON.stringify(data, null, 2));
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

  // ============================================
  // LOGIN SERVICE ENDPOINTS (Port 3001)
  // ============================================

  // Health Check - Login Service
  if (method === 'GET' && pathname === '/health') {
    sendJSON(res, 200, {
      success: true,
      message: 'Login Service is healthy (MOCKED)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'mock'
    });
    return;
  }

  // Service Info - Login Service
  if (method === 'GET' && pathname === '/') {
    sendJSON(res, 200, {
      success: true,
      message: 'Welcome to Login Service API (MOCKED)',
      version: '1.0.0',
      service: 'login',
      endpoints: [
        'POST /api/auth/register - Register new user',
        'POST /api/auth/login - User login',
        'GET /api/auth/me - Get user profile',
        'POST /api/auth/refresh - Refresh access token'
      ]
    });
    return;
  }

  // Register User
  if (method === 'POST' && pathname === '/api/auth/register') {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      sendJSON(res, 400, {
        success: false,
        message: 'Email and password are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    if (mockUsers.has(email)) {
      sendJSON(res, 409, {
        success: false,
        message: 'User already exists with this email',
        error: 'USER_EXISTS'
      });
      return;
    }

    const userId = `mock_user_${Math.random().toString(36).substring(7)}`;
    const accessToken = generateMockToken('access');
    const refreshToken = generateMockToken('refresh');

    mockUsers.set(email, {
      id: userId,
      email: email,
      password: password,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true
    });

    mockSessions.set(userId, [refreshToken]);

    sendJSON(res, 201, {
      success: true,
      message: 'User registered successfully (MOCKED)',
      data: {
        user: {
          id: userId,
          email: email,
          createdAt: new Date().toISOString()
        },
        accessToken: accessToken
      }
    });
    return;
  }

  // Login User
  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      sendJSON(res, 400, {
        success: false,
        message: 'Email and password are required',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    const user = mockUsers.get(email);
    if (!user || user.password !== password) {
      sendJSON(res, 401, {
        success: false,
        message: 'Invalid email or password',
        error: 'INVALID_CREDENTIALS'
      });
      return;
    }

    const accessToken = generateMockToken('access');
    const refreshToken = generateMockToken('refresh');

    user.lastLogin = new Date().toISOString();
    
    if (!mockSessions.has(user.id)) {
      mockSessions.set(user.id, []);
    }
    mockSessions.get(user.id).push(refreshToken);

    sendJSON(res, 200, {
      success: true,
      message: 'Login successful (MOCKED)',
      data: {
        user: {
          id: user.id,
          email: user.email,
          lastLogin: user.lastLogin
        },
        accessToken: accessToken
      }
    });
    return;
  }

  // Get User Profile
  if (method === 'GET' && pathname === '/api/auth/me') {
    const token = extractToken(req);

    if (!token) {
      sendJSON(res, 401, {
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    if (mockBlacklistedTokens.has(token)) {
      sendJSON(res, 403, {
        success: false,
        message: 'Token has been invalidated',
        error: 'TOKEN_BLACKLISTED'
      });
      return;
    }

    // Return mock user data
    const mockUser = Array.from(mockUsers.values())[0] || {
      id: 'mock_user_123',
      email: 'mock@example.com',
      isActive: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sendJSON(res, 200, {
      success: true,
      data: {
        user: mockUser
      }
    });
    return;
  }

  // Refresh Token
  if (method === 'POST' && pathname === '/api/auth/refresh') {
    const body = await parseBody(req);
    const refreshToken = body.refreshToken || req.headers['x-refresh-token'];

    if (!refreshToken) {
      sendJSON(res, 401, {
        success: false,
        message: 'Refresh token required',
        error: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    if (mockBlacklistedTokens.has(refreshToken)) {
      sendJSON(res, 401, {
        success: false,
        message: 'Refresh token has been invalidated',
        error: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    const newAccessToken = generateMockToken('access');

    sendJSON(res, 200, {
      success: true,
      message: 'Token refreshed successfully (MOCKED)',
      data: {
        accessToken: newAccessToken
      }
    });
    return;
  }

  // ============================================
  // LOGOUT SERVICE ENDPOINTS (Port 3002)
  // ============================================

  // Logout User
  if (method === 'POST' && pathname === '/api/logout') {
    const token = extractToken(req);

    if (!token) {
      sendJSON(res, 401, {
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    mockBlacklistedTokens.add(token);

    sendJSON(res, 200, {
      success: true,
      message: 'Logout successful (MOCKED)'
    });
    return;
  }

  // Logout from All Devices
  if (method === 'POST' && pathname === '/api/logout-all') {
    const token = extractToken(req);

    if (!token) {
      sendJSON(res, 401, {
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    mockBlacklistedTokens.add(token);

    sendJSON(res, 200, {
      success: true,
      message: 'Logged out from all devices successfully (MOCKED)'
    });
    return;
  }

  // Invalidate Specific Token
  if (method === 'POST' && pathname === '/api/invalidate-token') {
    const body = await parseBody(req);
    const { token, tokenType } = body;

    if (!token || !tokenType) {
      sendJSON(res, 400, {
        success: false,
        message: 'Token and token type are required',
        error: 'MISSING_PARAMETERS'
      });
      return;
    }

    if (!['access', 'refresh'].includes(tokenType)) {
      sendJSON(res, 400, {
        success: false,
        message: 'Invalid token type. Must be "access" or "refresh"',
        error: 'INVALID_TOKEN_TYPE'
      });
      return;
    }

    if (mockBlacklistedTokens.has(token)) {
      sendJSON(res, 409, {
        success: false,
        message: 'Token is already invalidated',
        error: 'TOKEN_ALREADY_BLACKLISTED'
      });
      return;
    }

    mockBlacklistedTokens.add(token);

    sendJSON(res, 200, {
      success: true,
      message: 'Token invalidated successfully (MOCKED)'
    });
    return;
  }

  // Check Token Blacklist Status
  if (method === 'GET' && pathname.startsWith('/api/check-token/')) {
    const token = pathname.split('/api/check-token/')[1];

    if (!token) {
      sendJSON(res, 400, {
        success: false,
        message: 'Token is required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    const isBlacklisted = mockBlacklistedTokens.has(decodeURIComponent(token));

    sendJSON(res, 200, {
      success: true,
      data: {
        isBlacklisted: isBlacklisted,
        blacklistedAt: isBlacklisted ? new Date().toISOString() : null
      }
    });
    return;
  }

  // Get Active Sessions
  if (method === 'GET' && pathname === '/api/sessions') {
    const token = extractToken(req);

    if (!token) {
      sendJSON(res, 401, {
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    const activeSessions = [
      {
        tokenId: 'session_1',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() + 518400000).toISOString(),
        isActive: true
      },
      {
        tokenId: 'session_2',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        expiresAt: new Date(Date.now() + 432000000).toISOString(),
        isActive: true
      }
    ];

    sendJSON(res, 200, {
      success: true,
      data: {
        activeSessions: activeSessions,
        totalSessions: activeSessions.length
      }
    });
    return;
  }

  // Cleanup Expired Tokens
  if (method === 'POST' && pathname === '/api/cleanup-tokens') {
    const removedCount = Math.floor(Math.random() * 10);

    sendJSON(res, 200, {
      success: true,
      message: 'Token cleanup completed (MOCKED)',
      data: {
        removedTokens: removedCount,
        cleanupTime: new Date().toISOString()
      }
    });
    return;
  }

  // 404 - Route not found
  sendJSON(res, 404, {
    success: false,
    message: `Route ${method} ${pathname} not found`,
    error: 'NOT_FOUND',
    availableEndpoints: {
      loginService: [
        'GET /health',
        'GET /',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/me',
        'POST /api/auth/refresh'
      ],
      logoutService: [
        'POST /api/logout',
        'POST /api/logout-all',
        'POST /api/invalidate-token',
        'GET /api/check-token/:token',
        'GET /api/sessions',
        'POST /api/cleanup-tokens'
      ]
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╭─────────────────────────────────────────────────────╮
│  🎭 Auth Service Mock Server Started               │
│                                                     │
│  Port:        ${PORT.toString().padEnd(12)}                        │
│  URL:         http://localhost:${PORT.toString().padEnd(4)}                │
│  Environment: MOCK                                  │
│                                                     │
│  📋 Mocked Endpoints:                               │
│                                                     │
│  Login Service (normally port 3001):               │
│  • GET  /health                                    │
│  • GET  /                                          │
│  • POST /api/auth/register                         │
│  • POST /api/auth/login                            │
│  • GET  /api/auth/me                               │
│  • POST /api/auth/refresh                          │
│                                                     │
│  Logout Service (normally port 3002):              │
│  • POST /api/logout                                │
│  • POST /api/logout-all                            │
│  • POST /api/invalidate-token                      │
│  • GET  /api/check-token/:token                    │
│  • GET  /api/sessions                              │
│  • POST /api/cleanup-tokens                        │
│                                                     │
│  💡 Usage:                                          │
│  This mock combines both services on one port.     │
│  No MongoDB required - all data stored in memory.  │
│  Perfect for frontend development & testing!       │
╰─────────────────────────────────────────────────────╯
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other service or use a different port.`);
    console.error(`   Try: PORT=3003 node postman/mocks/auth-service-mock.js`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Mock server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down mock server...');
  server.close(() => {
    console.log('✅ Mock server stopped');
    process.exit(0);
  });
});
