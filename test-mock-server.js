#!/usr/bin/env node

/**
 * Test Script for Auth Service Mock Server
 * 
 * This script tests all endpoints of the mock server to ensure they're working correctly.
 * Run this after starting the mock server to verify everything is functioning.
 * 
 * Usage:
 *   node test-mock-server.js
 *   node test-mock-server.js http://localhost:3003  # Custom port
 */

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const url = require('url');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(BASE_URL + path);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  if (passed) {
    testsPassed++;
    log(`  ✓ ${name}`, 'green');
    if (details) log(`    ${details}`, 'cyan');
  } else {
    testsFailed++;
    log(`  ✗ ${name}`, 'red');
    if (details) log(`    ${details}`, 'yellow');
  }
}

async function runTests() {
  log('\n╭─────────────────────────────────────────────────────╮', 'blue');
  log('│  🧪 Testing Auth Service Mock Server               │', 'blue');
  log('╰─────────────────────────────────────────────────────╯', 'blue');
  log(`\nTarget: ${BASE_URL}\n`, 'cyan');

  let accessToken = '';
  let testEmail = `test${Date.now()}@example.com`;
  let testPassword = 'SecurePass123!';

  try {
    // Test 1: Health Check
    log('📋 Test Suite: Health & Info Endpoints', 'blue');
    try {
      const health = await makeRequest('GET', '/health');
      logTest('Health check returns 200', health.status === 200);
      logTest('Health check has success field', health.body?.success === true);
      logTest('Health check indicates MOCK environment', 
        health.body?.message?.includes('MOCKED') || health.body?.environment === 'mock');
    } catch (e) {
      logTest('Health check endpoint', false, e.message);
    }

    // Test 2: Service Info
    try {
      const info = await makeRequest('GET', '/');
      logTest('Service info returns 200', info.status === 200);
      logTest('Service info has endpoints list', Array.isArray(info.body?.endpoints));
    } catch (e) {
      logTest('Service info endpoint', false, e.message);
    }

    log('\n📋 Test Suite: Authentication Endpoints', 'blue');

    // Test 3: Register User
    try {
      const register = await makeRequest('POST', '/api/auth/register', {
        email: testEmail,
        password: testPassword
      });
      logTest('User registration returns 201', register.status === 201);
      logTest('Registration returns access token', !!register.body?.data?.accessToken);
      logTest('Registration returns user data', !!register.body?.data?.user?.id);
      
      if (register.body?.data?.accessToken) {
        accessToken = register.body.data.accessToken;
        log(`    Token: ${accessToken.substring(0, 30)}...`, 'cyan');
      }
    } catch (e) {
      logTest('User registration', false, e.message);
    }

    // Test 4: Duplicate Registration
    try {
      const duplicate = await makeRequest('POST', '/api/auth/register', {
        email: testEmail,
        password: testPassword
      });
      logTest('Duplicate registration returns 409', duplicate.status === 409);
      logTest('Duplicate registration has error code', duplicate.body?.error === 'USER_EXISTS');
    } catch (e) {
      logTest('Duplicate registration check', false, e.message);
    }

    // Test 5: Login
    try {
      const login = await makeRequest('POST', '/api/auth/login', {
        email: testEmail,
        password: testPassword
      });
      logTest('User login returns 200', login.status === 200);
      logTest('Login returns access token', !!login.body?.data?.accessToken);
      logTest('Login returns user with lastLogin', !!login.body?.data?.user?.lastLogin);
    } catch (e) {
      logTest('User login', false, e.message);
    }

    // Test 6: Invalid Login
    try {
      const invalidLogin = await makeRequest('POST', '/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword123!'
      });
      logTest('Invalid login returns 401', invalidLogin.status === 401);
      logTest('Invalid login has error code', invalidLogin.body?.error === 'INVALID_CREDENTIALS');
    } catch (e) {
      logTest('Invalid login check', false, e.message);
    }

    log('\n📋 Test Suite: Protected Endpoints', 'blue');

    // Test 7: Get Profile (with token)
    if (accessToken) {
      try {
        const profile = await makeRequest('GET', '/api/auth/me', null, {
          'Authorization': `Bearer ${accessToken}`
        });
        logTest('Get profile with token returns 200', profile.status === 200);
        logTest('Profile has user data', !!profile.body?.data?.user);
        logTest('Profile has email field', !!profile.body?.data?.user?.email);
      } catch (e) {
        logTest('Get profile with token', false, e.message);
      }
    }

    // Test 8: Get Profile (without token)
    try {
      const noAuth = await makeRequest('GET', '/api/auth/me');
      logTest('Get profile without token returns 401', noAuth.status === 401);
      logTest('No auth has error code', noAuth.body?.error === 'MISSING_TOKEN');
    } catch (e) {
      logTest('Get profile without token', false, e.message);
    }

    // Test 9: Refresh Token
    try {
      const refresh = await makeRequest('POST', '/api/auth/refresh', {
        refreshToken: 'mock_refresh_token_123'
      });
      logTest('Token refresh returns 200', refresh.status === 200);
      logTest('Refresh returns new access token', !!refresh.body?.data?.accessToken);
    } catch (e) {
      logTest('Token refresh', false, e.message);
    }

    log('\n📋 Test Suite: Logout Endpoints', 'blue');

    // Test 10: Logout
    if (accessToken) {
      try {
        const logout = await makeRequest('POST', '/api/logout', null, {
          'Authorization': `Bearer ${accessToken}`
        });
        logTest('Logout returns 200', logout.status === 200);
        logTest('Logout has success message', logout.body?.success === true);
      } catch (e) {
        logTest('Logout', false, e.message);
      }
    }

    // Test 11: Check Token Status
    if (accessToken) {
      try {
        const checkToken = await makeRequest('GET', `/api/check-token/${encodeURIComponent(accessToken)}`);
        logTest('Check token returns 200', checkToken.status === 200);
        logTest('Check token has isBlacklisted field', 
          typeof checkToken.body?.data?.isBlacklisted === 'boolean');
        logTest('Token is blacklisted after logout', 
          checkToken.body?.data?.isBlacklisted === true);
      } catch (e) {
        logTest('Check token status', false, e.message);
      }
    }

    // Test 12: Get Sessions
    try {
      const newToken = generateMockToken();
      const sessions = await makeRequest('GET', '/api/sessions', null, {
        'Authorization': `Bearer ${newToken}`
      });
      logTest('Get sessions returns 200', sessions.status === 200);
      logTest('Sessions has activeSessions array', Array.isArray(sessions.body?.data?.activeSessions));
      logTest('Sessions has totalSessions count', typeof sessions.body?.data?.totalSessions === 'number');
    } catch (e) {
      logTest('Get sessions', false, e.message);
    }

    // Test 13: Logout All
    try {
      const newToken = generateMockToken();
      const logoutAll = await makeRequest('POST', '/api/logout-all', null, {
        'Authorization': `Bearer ${newToken}`
      });
      logTest('Logout all returns 200', logoutAll.status === 200);
      logTest('Logout all has success message', logoutAll.body?.success === true);
    } catch (e) {
      logTest('Logout all', false, e.message);
    }

    // Test 14: Invalidate Token
    try {
      const invalidate = await makeRequest('POST', '/api/invalidate-token', {
        token: 'some_token_to_invalidate',
        tokenType: 'access'
      });
      logTest('Invalidate token returns 200', invalidate.status === 200);
      logTest('Invalidate has success message', invalidate.body?.success === true);
    } catch (e) {
      logTest('Invalidate token', false, e.message);
    }

    // Test 15: Cleanup Tokens
    try {
      const cleanup = await makeRequest('POST', '/api/cleanup-tokens');
      logTest('Cleanup tokens returns 200', cleanup.status === 200);
      logTest('Cleanup has removedTokens count', typeof cleanup.body?.data?.removedTokens === 'number');
    } catch (e) {
      logTest('Cleanup tokens', false, e.message);
    }

    log('\n📋 Test Suite: Error Handling', 'blue');

    // Test 16: 404 for unknown route
    try {
      const notFound = await makeRequest('GET', '/api/unknown/route');
      logTest('Unknown route returns 404', notFound.status === 404);
      logTest('404 response has error field', notFound.body?.error === 'NOT_FOUND');
      logTest('404 response lists available endpoints', !!notFound.body?.availableEndpoints);
    } catch (e) {
      logTest('404 handling', false, e.message);
    }

    // Test 17: Missing required fields
    try {
      const missingFields = await makeRequest('POST', '/api/auth/register', {});
      logTest('Missing fields returns 400', missingFields.status === 400);
      logTest('Missing fields has validation error', missingFields.body?.error === 'VALIDATION_ERROR');
    } catch (e) {
      logTest('Missing fields validation', false, e.message);
    }

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    log('\nMake sure the mock server is running:', 'yellow');
    log(`  node postman/mocks/mock.js`, 'cyan');
    process.exit(1);
  }

  // Summary
  log('\n╭─────────────────────────────────────────────────────╮', 'blue');
  log('│  📊 Test Results                                    │', 'blue');
  log('╰─────────────────────────────────────────────────────╯', 'blue');
  log(`\nTotal Tests: ${testsPassed + testsFailed}`, 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`, 
    testsFailed === 0 ? 'green' : 'yellow');

  if (testsFailed === 0) {
    log('✅ All tests passed! Mock server is working correctly.\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Check the output above for details.\n', 'yellow');
    process.exit(1);
  }
}

function generateMockToken() {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 
         Buffer.from(JSON.stringify({ userId: 'test', exp: Date.now() + 86400000 })).toString('base64') +
         '.mock_signature';
}

// Run the tests
log('\n🚀 Starting mock server tests...', 'cyan');
log(`Waiting for server at ${BASE_URL}...\n`, 'cyan');

// Wait a moment for server to be ready
setTimeout(runTests, 1000);
