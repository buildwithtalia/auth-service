# Authentication Microservices

A secure, production-ready authentication system built with a microservices architecture using Node.js, Express, and MongoDB. The system is split into two specialized services: **Login Service** and **Logout Service** for better scalability and separation of concerns.

## ⚡ Quick Start

```bash
# Clone and start everything with one command
git clone <repository-url>
cd auth-service
./start-services.sh
```

**Services will be available at:**
- 🔐 **Login Service**: http://localhost:3001
- 🔓 **Logout Service**: http://localhost:3002
- 📋 **API Documentation**: `postman/specs/auth-service-api.yaml`

**✅ Automated CI/CD Testing**: Every pull request runs 25+ API tests across both services

## Architecture Overview

### 🔐 Login Service (Port 3001)
Handles user authentication and token generation:
- User registration
- User login
- User profile management
- Token refresh

### 🔓 Logout Service (Port 3002)
Manages token invalidation and session termination:
- User logout (single session)
- Logout from all devices
- Token blacklisting
- Session management
- Token validation checks

### 📦 Shared Components
Common utilities and models used by both services:
- User model
- JWT utilities
- Password utilities
- Configuration management

## Benefits of Microservices Architecture

- **Separation of Concerns**: Login and logout are handled by dedicated services
- **Independent Scaling**: Scale login and logout services independently based on load
- **Security**: Token blacklisting is isolated in the logout service
- **Maintainability**: Smaller, focused codebases
- **Resilience**: Failure in one service doesn't affect the other
- **Technology Diversity**: Services can use different technologies if needed

## Quick Start

### Prerequisites

- Node.js (v16.0.0 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd authentication-microservices
   ```

2. **Install dependencies for both services**
   ```bash
   # Install Login Service dependencies
   cd login-service
   npm install

   # Install Logout Service dependencies
   cd ../logout-service
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Configure Login Service
   cd ../login-service
   cp .env.example .env
   # Edit .env with your configuration

   # Configure Logout Service
   cd ../logout-service
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest

   # Or use your local MongoDB installation
   mongod
   ```

5. **Start both services**
   ```bash
   # Terminal 1 - Start Login Service
   cd login-service
   npm run dev

   # Terminal 2 - Start Logout Service
   cd logout-service
   npm run dev
   ```

The services will start on:
- **Login Service**: `http://localhost:3001`
- **Logout Service**: `http://localhost:3002`

### Using the Automated Start Script

Alternatively, use the provided automated script:

```bash
# Start both services and MongoDB automatically
./start-services.sh
```

This script will:
- ✅ Check prerequisites (Node.js, npm, MongoDB/Docker)
- ✅ Start MongoDB via Docker if not running
- ✅ Install dependencies for both services
- ✅ Create environment files from templates
- ✅ Start both services in background
- ✅ Verify services are healthy
- ✅ Display service URLs and endpoints

To stop the services:
```bash
./stop-services.sh
```

## Environment Configuration

### Login Service (.env)
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/login-service
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production-32chars
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
CORS_ORIGIN=http://localhost:3000
```

### Logout Service (.env)
```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/login-service
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production-32chars
RATE_LIMIT_MAX_REQUESTS=10
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## API Documentation

### Login Service API (Port 3001)

#### Base URL
```
http://localhost:3001/api/auth
```

#### Endpoints

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Login User**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Get User Profile**
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Refresh Access Token**
```http
POST /api/auth/refresh
Cookie: refreshToken=<refresh_token_cookie>
```

### Logout Service API (Port 3002)

#### Base URL
```
http://localhost:3002/api
```

#### Endpoints

**Logout User**
```http
POST /api/logout
Authorization: Bearer <access_token>
Cookie: refreshToken=<refresh_token_cookie>
```

**Logout from All Devices**
```http
POST /api/logout-all
Authorization: Bearer <access_token>
```

**Invalidate Specific Token**
```http
POST /api/invalidate-token
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "token": "jwt_token_to_invalidate",
  "tokenType": "access" | "refresh"
}
```

**Check Token Blacklist Status**
```http
GET /api/check-token/:token
```

**Get Active Sessions**
```http
GET /api/sessions
Authorization: Bearer <access_token>
```

**Cleanup Expired Tokens**
```http
POST /api/cleanup-tokens
```

### OpenAPI Specification

Complete API documentation is available in OpenAPI 3.0 format:
- **File**: `postman/specs/auth-service-api.yaml`
- **Interactive Documentation**: Import the spec into Swagger UI or Postman
- **Validation**: Automatically validated in CI/CD pipeline

## Automated Testing & CI/CD

### GitHub Actions Pipeline

The project includes a comprehensive CI/CD pipeline that runs on every pull request:

**Pipeline Steps:**
1. 🔧 **Setup**: Install Node.js and dependencies for all services
2. 🗄️ **Database**: Start MongoDB container with authentication
3. 🚀 **Services**: Launch login service (3001) and logout service (3002)
4. 🔍 **Health Checks**: Verify both services respond to `/health` endpoints
5. 📋 **API Testing**: Run complete Postman test suite
6. 📊 **Spec Validation**: Lint OpenAPI specification
7. 📈 **Reports**: Generate test reports and upload artifacts
8. 🧹 **Cleanup**: Stop services and containers

**Workflow File**: `.github/workflows/api-tests.yaml`

### Postman Test Suite

Comprehensive API testing with Postman:

**Collection**: `postman/collections/Auth Service API.postman_collection.json`

**Test Coverage:**
- ✅ **Login Service Tests** (14+ test cases)
  - Health checks and service info
  - User registration with validation
  - User authentication with JWT extraction
  - Profile retrieval with authorization
  - Token refresh flow
- ✅ **Logout Service Tests** (12+ test cases)
  - Single session logout
  - Multi-device logout
  - Token blacklisting and validation
  - Session management
  - Token cleanup operations

**Test Validations:**
- **Status Codes**: 200, 201, 400, 401, etc.
- **Response Times**: < 2000ms performance checks
- **Headers**: Content-Type and security headers
- **JSON Schema**: Response structure validation
- **JWT Tokens**: Format validation and extraction
- **Security**: Password exclusion, token format
- **Variable Extraction**: Automatic token/ID extraction for request chaining

### Running Tests Locally

**Prerequisites:**
- Postman CLI installed
- Services running on localhost:3001 and localhost:3002

**Run Collection:**
```bash
# Install Postman CLI
npm install -g @postman/cli

# Run the test suite
postman collection run "postman/collections/Auth Service API.postman_collection.json" \
  --env-var "baseUrl=http://localhost" \
  --env-var "loginServicePort=3001" \
  --env-var "logoutServicePort=3002" \
  --reporters cli,html \
  --reporter-html-export test-results.html
```

**Environment Variables for Testing:**
```bash
# Service URLs
baseUrl=http://localhost
loginServicePort=3001
logoutServicePort=3002
loginServiceUrl=http://localhost:3001
logoutServiceUrl=http://localhost:3002
```

## Authentication Flow

### Registration/Login Flow
1. Client sends registration/login request to **Login Service**
2. Login Service validates credentials and creates JWT tokens
3. Access token returned to client, refresh token stored as HTTP-only cookie
4. Client uses access token for authenticated requests

### Logout Flow
1. Client sends logout request to **Logout Service**
2. Logout Service blacklists the access token
3. Refresh token is removed from user's stored tokens
4. Refresh token cookie is cleared

### Token Validation Flow
1. Client makes authenticated request to any service
2. Service validates JWT token signature and expiration
3. **Logout Service** checks if token is blacklisted (for enhanced security)
4. Request proceeds if token is valid and not blacklisted

## Security Features

### Authentication & Authorization
- JWT access tokens with configurable expiration
- JWT refresh tokens with HTTP-only cookies
- Token blacklisting for immediate invalidation
- Secure password hashing with bcrypt

### Rate Limiting
- **Login Service**: 5 auth attempts per 15 minutes
- **Logout Service**: 10 logout attempts per 15 minutes
- Configurable per endpoint

### Security Headers
- Content Security Policy (CSP)
- XSS Protection
- CSRF Prevention
- Secure cookie configuration

### Token Blacklisting
- Immediate token invalidation on logout
- Automatic cleanup of expired blacklisted tokens
- Protection against token replay attacks

## Database Schema

### User Model (Shared)
```javascript
{
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshTokens: [{ token: String, createdAt: Date }],
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### BlacklistedToken Model (Logout Service)
```javascript
{
  token: { type: String, required: true, unique: true },
  tokenType: { type: String, enum: ['access', 'refresh'] },
  userId: { type: ObjectId, ref: 'User' },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  blacklistedAt: { type: Date, default: Date.now },
  reason: { type: String, enum: ['logout', 'logout-all', 'manual-invalidation'] }
}
```

## Service Communication

### Inter-Service Communication
Services can communicate via HTTP API calls:

```javascript
// Example: Login Service checking token blacklist status
const response = await fetch('http://logout-service:3002/api/check-token/' + token);
const { isBlacklisted } = await response.json();
```

### Service Discovery
For production deployment, consider using:
- Service mesh (Istio, Linkerd)
- API Gateway (Kong, Ambassador)
- Load balancer (nginx, HAProxy)
- Service registry (Consul, etcd)

## Testing

### Test Login Service
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}' \
  -c cookies.txt

# Get profile
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Test Logout Service
```bash
# Logout
curl -X POST http://localhost:3002/api/logout \
  -H "Authorization: Bearer <access_token>" \
  -b cookies.txt

# Check token status
curl -X GET http://localhost:3002/api/check-token/<token>

# Get active sessions
curl -X GET http://localhost:3002/api/sessions \
  -H "Authorization: Bearer <access_token>"
```

## Deployment

### Docker Deployment

**Login Service Dockerfile**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Logout Service Dockerfile**
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

**Docker Compose**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  login-service:
    build: ./login-service
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/login-service
      - NODE_ENV=production
    depends_on:
      - mongodb

  logout-service:
    build: ./logout-service
    ports:
      - "3002:3002"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/login-service
      - NODE_ENV=production
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

### Kubernetes Deployment

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: login-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: login-service
  template:
    metadata:
      labels:
        app: login-service
    spec:
      containers:
      - name: login-service
        image: login-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: MONGODB_URI
          value: "mongodb://mongodb-service:27017/login-service"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logout-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: logout-service
  template:
    metadata:
      labels:
        app: logout-service
    spec:
      containers:
      - name: logout-service
        image: logout-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: MONGODB_URI
          value: "mongodb://mongodb-service:27017/login-service"
```

## Monitoring & Observability

### Health Checks
- **Login Service**: `GET http://localhost:3001/health`
- **Logout Service**: `GET http://localhost:3002/health`

### Metrics to Monitor
- Request rates per service
- Response times
- Error rates
- Token blacklist size
- Active user sessions
- Database connection health

### Logging
Both services include structured logging:
- Request/response logging
- Error tracking
- Security events
- Performance metrics

## Production Considerations

### Security
- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Set up proper CORS origins
- Implement API key authentication for service-to-service calls
- Regular security audits

### Performance
- Implement Redis for token blacklist caching
- Use connection pooling for MongoDB
- Set up proper indexes
- Monitor and optimize database queries

### Scalability
- Scale services independently based on load
- Use horizontal pod autoscaling in Kubernetes
- Implement circuit breakers for resilience
- Consider read replicas for database

### High Availability
- Deploy services across multiple availability zones
- Use load balancers
- Implement health checks and auto-recovery
- Set up database replication

## Development

### Project Structure
```
auth-service/
├── .github/
│   └── workflows/
│       ├── api-tests.yaml      # CI/CD pipeline for API testing
│       └── working.yaml        # Reference working workflow
├── shared/                     # Shared utilities and models
│   ├── models/
│   │   └── User.js            # Shared user model
│   ├── utils/
│   │   ├── jwt.js             # JWT token utilities
│   │   └── password.js        # Password hashing utilities
│   ├── config/
│   │   └── config.js          # Shared configuration
│   └── package.json           # Shared dependencies
├── login-service/             # Login Service (Port 3001)
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── models/           # Service-specific models
│   │   ├── routes/           # API route definitions
│   │   └── utils/            # Service utilities
│   ├── server.js             # Login service entry point
│   ├── package.json          # Login service dependencies
│   ├── Dockerfile           # Docker configuration
│   └── .env                 # Environment variables
├── logout-service/           # Logout Service (Port 3002)
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── models/          # Blacklisted token model
│   │   └── routes/          # API route definitions
│   ├── server.js            # Logout service entry point
│   ├── package.json         # Logout service dependencies
│   ├── Dockerfile          # Docker configuration
│   └── .env                # Environment variables
├── postman/                 # API Testing Infrastructure
│   ├── collections/
│   │   └── Auth Service API.postman_collection.json  # Test collection
│   ├── environments/        # Environment configurations
│   ├── globals/
│   │   └── workspace.postman_globals.json            # Global variables
│   └── specs/
│       └── auth-service-api.yaml                     # OpenAPI 3.0 spec
├── logs/                    # Runtime logs (gitignored)
│   ├── login-service.pid   # Process IDs for cleanup
│   └── logout-service.pid
├── docker-compose.yml      # Multi-service Docker setup
├── start-services.sh       # Automated service startup
├── stop-services.sh        # Automated service shutdown
├── .gitignore             # Git exclusions
└── README.md              # This documentation
```

### Adding New Services
To add a new service to the architecture:

1. Create service directory
2. Set up package.json with dependencies
3. Import shared utilities from `../shared/`
4. Follow existing patterns for error handling and middleware
5. Update documentation and Docker configuration

## Troubleshooting

### Common Issues

**Services can't connect to MongoDB**
- Check MongoDB is running
- Verify connection string in .env files
- Check network connectivity

**Token validation fails**
- Ensure JWT secrets match across services
- Check token blacklist status
- Verify token hasn't expired

**CORS errors**
- Update CORS_ORIGIN in environment variables
- Check service ports are correct
- Verify request origins

**GitHub Actions Pipeline Failures**
- Check MongoDB startup timeout (increased to 90 seconds)
- Verify environment variables are set correctly
- Check service health endpoints are responding
- Review Postman collection for failing tests

**Postman Tests Not Running All Endpoints**
- Ensure using local collection file, not remote collection ID
- Remove `--bail` flag to run all tests regardless of failures
- Check collection structure and test scripts
- Verify environment variables match service configuration

**Service Port Conflicts**
- Login service must run on port 3001
- Logout service must run on port 3002
- Check no other services are using these ports
- Update `.env` files if port conflicts occur

### Debug Mode
Start services in debug mode:
```bash
NODE_ENV=development DEBUG=* npm run dev
```

### View Service Logs
```bash
# View real-time logs
tail -f logs/login-service.log
tail -f logs/logout-service.log

# View startup scripts logs
./start-services.sh  # Shows detailed startup process
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new functionality
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check service health endpoints
- Review logs for error details

## Recent Improvements

### ✅ Fixed CI/CD Pipeline (Latest)
- **Issue**: Only health check endpoints were running in GitHub Actions
- **Root Cause**: Incorrect collection reference and `--bail` flag stopping tests
- **Solution**: Updated to use local collection file with full test execution
- **Result**: Complete API test suite now runs (14+ login tests, 12+ logout tests)

### ✅ Enhanced MongoDB Reliability
- **Issue**: MongoDB startup timeouts in CI environment
- **Solution**: Extended timeout to 90 seconds with enhanced error handling
- **Added**: Support for both `mongosh` and legacy `mongo` shell commands
- **Result**: Reliable database connectivity in all environments

### ✅ Microservices Architecture Fixes
- **Fixed**: Service route imports and port configurations
- **Added**: Shared dependency management for common utilities
- **Enhanced**: Environment variable management across services
- **Result**: Reliable service startup and inter-service communication

### ✅ Comprehensive API Testing
- **Added**: Complete Postman collection with 25+ test cases
- **Features**: Status code validation, response time checks, JWT validation
- **Automation**: Variable extraction for request chaining
- **Coverage**: All endpoints across both microservices

### ✅ Documentation & Automation
- **Added**: OpenAPI 3.0 specification for complete API documentation
- **Created**: Automated startup/shutdown scripts
- **Enhanced**: Docker and Docker Compose configurations
- **Added**: Comprehensive troubleshooting guides

## Changelog

### v1.2.0 (CI/CD & Testing Enhancement)
- Implemented comprehensive GitHub Actions CI/CD pipeline
- Added complete Postman test suite with 25+ test cases
- Created OpenAPI 3.0 specification
- Enhanced MongoDB reliability with 90-second timeout
- Added automated service startup/shutdown scripts
- Fixed microservices architecture communication issues
- Added detailed troubleshooting documentation

### v1.1.0 (Microservices Stabilization)
- Fixed service route imports and port configurations
- Added shared dependency management
- Enhanced environment variable handling
- Improved Docker configurations
- Added service health checks

### v1.0.0 (Microservices Architecture)
- Split monolithic service into Login and Logout services
- Implemented token blacklisting
- Added session management
- Enhanced security with service separation
- Added comprehensive documentation
- Created Docker and Kubernetes deployment configs