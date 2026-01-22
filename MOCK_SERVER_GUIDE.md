# 🎭 Auth Service Mock Server - Quick Start Guide

This guide will help you quickly set up and use the local mock server for the Auth Service API.

## What is the Mock Server?

The mock server is a lightweight HTTP server that simulates both the Login Service and Logout Service without requiring:
- ❌ MongoDB database
- ❌ Running actual microservices
- ❌ Network connectivity
- ❌ Complex setup

Perfect for frontend development, testing, and rapid prototyping!

## 🚀 Quick Start

### Step 1: Start the Mock Server

**Option A: Using Postman (Recommended)**
1. Open Postman
2. Go to **Mock Servers** tab (left sidebar)
3. Find "Local Mock" in the list
4. Click **Start** button
5. ✅ Server running on `http://localhost:3000`

**Option B: Using Terminal**
```bash
# From the repository root
node postman/mocks/mock.js

# Or with custom port
PORT=3003 node postman/mocks/mock.js
```

### Step 2: Test the Mock Server

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "success": true,
  "message": "Login Service is healthy (MOCKED)",
  "timestamp": "2024-01-22T10:30:00.000Z",
  "uptime": 5.123,
  "environment": "mock"
}
```

### Step 3: Use with Postman Collection

1. Open the **Auth Service API** collection in Postman
2. Update collection variables (or create a new environment):
   - `baseUrl`: `http://localhost`
   - `loginServicePort`: `3000`
   - `logoutServicePort`: `3000`
3. Run any request - it will hit the mock server!

## 📋 Common Workflows

### 1️⃣ Register a New User

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully (MOCKED)",
  "data": {
    "user": {
      "id": "mock_user_xyz789",
      "email": "alice@example.com",
      "createdAt": "2024-01-22T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ4eXo3ODkiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTcwNTkyNjYwMH0.abc123"
  }
}
```

💡 **Save the `accessToken` for the next steps!**

### 2️⃣ Login

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

### 3️⃣ Get User Profile (Protected Endpoint)

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "mock_user_xyz789",
      "email": "alice@example.com",
      "isActive": true,
      "lastLogin": "2024-01-22T10:30:00.000Z",
      "createdAt": "2024-01-22T10:30:00.000Z",
      "updatedAt": "2024-01-22T10:30:00.000Z"
    }
  }
}
```

### 4️⃣ Logout

**Request:**
```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful (MOCKED)"
}
```

### 5️⃣ Check Token Status

**Request:**
```bash
curl http://localhost:3000/api/check-token/YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isBlacklisted": true,
    "blacklistedAt": "2024-01-22T10:35:00.000Z"
  }
}
```

## 🎯 All Available Endpoints

### Login Service Endpoints
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | ❌ | Health check |
| GET | `/` | ❌ | Service info |
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get user profile |
| POST | `/api/auth/refresh` | ❌ | Refresh access token |

### Logout Service Endpoints
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/logout` | ✅ | Logout current session |
| POST | `/api/logout-all` | ✅ | Logout all devices |
| POST | `/api/invalidate-token` | ❌ | Invalidate specific token |
| GET | `/api/check-token/:token` | ❌ | Check token status |
| GET | `/api/sessions` | ✅ | Get active sessions |
| POST | `/api/cleanup-tokens` | ❌ | Cleanup expired tokens |

## 🔐 Authentication

For protected endpoints (marked with ✅), include the Bearer token:

```bash
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 💾 Data Persistence

⚠️ **Important**: All data is stored in memory and will be **lost when the server stops**.

This includes:
- User accounts
- Blacklisted tokens
- Active sessions

This is intentional - perfect for testing without side effects!

## 🐛 Troubleshooting

### Problem: Port 3000 is already in use

**Solution 1**: Stop the other service using port 3000
```bash
# Find process using port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solution 2**: Use a different port
```bash
PORT=3003 node postman/mocks/mock.js
```

Then update your requests to use `http://localhost:3003`

### Problem: "Cannot find module 'http'"

**Solution**: Make sure you're using Node.js (not browser JavaScript)
```bash
node --version  # Should show v14 or higher
```

### Problem: Token not working

**Solutions**:
- Ensure you're using the correct format: `Authorization: Bearer <token>`
- Check if the token was blacklisted (logout invalidates tokens)
- Restart the mock server to clear all blacklisted tokens

### Problem: CORS errors in browser

**Solutions**:
- Use `http://localhost:3000` not `http://127.0.0.1:3000`
- Check browser console for specific error messages
- The mock server includes CORS headers by default

## 🎨 Use Cases

### Frontend Development
```javascript
// Point your frontend to the mock server
const API_BASE_URL = 'http://localhost:3000';

// Make requests as usual
const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### Automated Testing
```javascript
// In your test suite
beforeAll(async () => {
  // Start mock server
  mockServer = require('./postman/mocks/mock.js');
});

test('should register user', async () => {
  const response = await request('http://localhost:3000')
    .post('/api/auth/register')
    .send({ email: 'test@example.com', password: 'Test123!' });
  
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
});
```

### API Exploration
Use the mock server to understand the API without setting up the full stack:
1. Start mock server
2. Open Postman
3. Try different endpoints
4. See response formats
5. Understand authentication flow

## 📚 Next Steps

- **Full Documentation**: See `postman/mocks/README.md`
- **Customize Responses**: Edit `postman/mocks/mock.js`
- **Real Services**: See `login-service/` and `logout-service/` directories
- **API Collection**: Open "Auth Service API" in Postman

## 🛑 Stopping the Server

**From Postman**: Click **Stop** button in Mock Servers tab

**From Terminal**: Press `Ctrl+C`

## 💡 Pro Tips

1. **Keep it running**: Leave the mock server running while developing
2. **Multiple terminals**: Run mock in one terminal, test in another
3. **Environment switching**: Create separate Postman environments for mock vs real services
4. **Error testing**: Modify mock.js to return specific error codes
5. **No cleanup needed**: In-memory storage means no database cleanup required

## 🤝 Need Help?

- Check `postman/mocks/README.md` for detailed documentation
- Review the mock server code in `postman/mocks/mock.js`
- Test with the Postman collection: "Auth Service API"

---

**Happy Mocking! 🎭**
