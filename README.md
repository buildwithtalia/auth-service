# Authentication Microservices

A secure, production-ready authentication system built with a microservices architecture using Node.js, Express, and MongoDB. The system is split into two specialized services: **Login Service** and **Logout Service** for better scalability and separation of concerns.

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
authentication-microservices/
├── shared/                    # Shared utilities and models
│   ├── models/
│   ├── utils/
│   └── config/
├── login-service/            # Login Service
│   ├── src/
│   ├── server.js
│   └── package.json
├── logout-service/           # Logout Service
│   ├── src/
│   ├── server.js
│   └── package.json
└── README.md
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

### Debug Mode
Start services in debug mode:
```bash
NODE_ENV=development DEBUG=* npm run dev
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

## Changelog

### v1.0.0 (Microservices Architecture)
- Split monolithic service into Login and Logout services
- Implemented token blacklisting
- Added session management
- Enhanced security with service separation
- Added comprehensive documentation
- Created Docker and Kubernetes deployment configs