# Auth Service Mock Server

This directory contains a local HTTP-based mock server that simulates the Auth Service API endpoints without requiring MongoDB or the actual microservices to be running.

## 🎯 Purpose

The mock server is designed for:
- **Frontend Development**: Develop UI without backend dependencies
- **API Testing**: Test API integrations without a database
- **Offline Development**: Work without network connectivity to real services
- **Quick Prototyping**: Rapidly test authentication flows

## 📁 Files

- `mock.js` - The HTTP mock server implementation
- `mock.json` - Mock server manifest (Postman configuration)
- `README.md` - This documentation file

## 🚀 Starting the Mock Server

### Option 1: Using Postman UI
1. Open Postman
2. Navigate to the **Mock Servers** tab
3. Find "Local Mock" in the list
4. Click **Start** button
5. The mock server will start on port 3000 (or the configured port)

### Option 2: Using Command Line
```bash
# From the repository root
node postman/mocks/mock.js

# Or specify a custom port
PORT=3003 node postman/mocks/mock.js
```

## 🔌 Endpoints

The mock server combines both Login Service and Logout Service endpoints on a single port.

### Login Service Endpoints (normally port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/` | Service information |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/me` | Get current user profile (requires auth) |
| POST | `/api/auth/refresh` | Refresh access token |

### Logout Service Endpoints (normally port 3002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/logout` | Logout current session |
| POST | `/api/logout-all` | Logout from all devices |
| POST | `/api/invalidate-token` | Invalidate a specific token |
| GET | `/api/check-token/:token` | Check if token is blacklisted |
| GET | `/api/sessions` | Get active sessions |
| POST | `/api/cleanup-tokens` | Cleanup expired tokens |

## 📝 Usage Examples

### Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
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
      "id": "mock_user_abc123",
      "email": "test@example.com",
      "createdAt": "2024-01-22T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Get User Profile (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout
```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Check Token Status
```bash
curl -X GET http://localhost:3000/api/check-token/YOUR_TOKEN_HERE
```

## 🔐 Authentication

The mock server uses Bearer Token authentication for protected endpoints:

```
Authorization: Bearer <access_token>
```

Mock tokens are automatically generated and have the following format:
- **Access Token**: Valid for 24 hours (mocked)
- **Refresh Token**: Valid for 7 days (mocked)

## 💾 Data Storage

All data is stored **in-memory** and will be lost when the server stops:
- User accounts
- Blacklisted tokens
- Active sessions

This makes the mock perfect for testing without side effects.

## 🎨 Features

### ✅ What's Mocked
- User registration and login
- Token generation (JWT-like format)
- Token blacklisting
- Session management
- All response formats match the real API
- Proper HTTP status codes
- CORS headers for browser access

### ❌ What's NOT Mocked
- Real JWT verification (tokens are generated but not cryptographically verified)
- Password hashing (passwords stored in plain text in memory)
- Database persistence
- Token expiration enforcement
- Rate limiting
- Email validation

## 🔄 Using with Postman Collection

To use the mock server with the "Auth Service API" collection:

1. **Start the mock server** (port 3000)
2. **Update collection variables**:
   - Set `baseUrl` to `http://localhost`
   - Set `loginServicePort` to `3000`
   - Set `logoutServicePort` to `3000`
3. **Run requests** - All endpoints will hit the mock server

Alternatively, create a new environment:
```json
{
  "name": "Mock Environment",
  "values": [
    { "key": "baseUrl", "value": "http://localhost", "enabled": true },
    { "key": "loginServicePort", "value": "3000", "enabled": true },
    { "key": "logoutServicePort", "value": "3000", "enabled": true }
  ]
}
```

## 🐛 Troubleshooting

### Port Already in Use
If you see `EADDRINUSE` error:
```bash
# Use a different port
PORT=3003 node postman/mocks/mock.js
```

### CORS Issues
The mock server includes CORS headers by default. If you still face issues:
- Check browser console for specific errors
- Ensure you're using `http://localhost` not `127.0.0.1`
- Try disabling browser CORS extensions

### Token Not Working
- Make sure you're including the `Authorization: Bearer <token>` header
- Check that the token hasn't been blacklisted (logout invalidates tokens)
- Restart the mock server to clear all blacklisted tokens

## 🔧 Customization

To modify mock responses or add new endpoints:

1. Open `postman/mocks/mock.js`
2. Find the endpoint handler you want to modify
3. Update the response data
4. Restart the mock server

Example - Modify registration response:
```javascript
// Find this section in mock.js
if (method === 'POST' && pathname === '/api/auth/register') {
  // Modify the response here
  sendJSON(res, 201, {
    success: true,
    message: 'Custom message here',
    data: {
      // Your custom data
    }
  });
}
```

## 📊 Monitoring

The mock server logs all requests to the console:
```
[2024-01-22T10:30:00.000Z] POST /api/auth/register
[2024-01-22T10:30:05.000Z] POST /api/auth/login
[2024-01-22T10:30:10.000Z] GET /api/auth/me
```

## 🛑 Stopping the Mock Server

### From Postman UI
Click the **Stop** button in the Mock Servers tab

### From Command Line
Press `Ctrl+C` in the terminal where the server is running

## 💡 Tips

1. **Use for Frontend Development**: Point your frontend to `http://localhost:3000` instead of the real services
2. **Test Error Scenarios**: Modify the mock to return specific error codes
3. **Rapid Iteration**: No need to seed databases or manage state
4. **Parallel Development**: Frontend and backend teams can work independently
5. **CI/CD Testing**: Use in automated tests without external dependencies

## 🔗 Related Files

- Main services: `login-service/server.js`, `logout-service/server.js`
- Postman collection: `postman/collections/Auth Service API.postman_collection.json`
- Real API documentation: See collection description

## 📚 Additional Resources

- [Postman Mock Servers Documentation](https://learning.postman.com/docs/designing-and-developing-your-api/mocking-data/setting-up-mock/)
- [Node.js HTTP Module](https://nodejs.org/api/http.html)
- Auth Service API Collection (in Postman)
