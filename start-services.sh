#!/bin/bash

# Authentication Microservices Startup Script
echo "🚀 Starting Authentication Microservices..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16 or higher.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

if ! command_exists mongod && ! command_exists docker; then
    echo -e "${RED}❌ MongoDB is not installed and Docker is not available.${NC}"
    echo -e "${YELLOW}Please install MongoDB or Docker to continue.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB...${NC}"
if port_in_use 27017; then
    echo -e "${GREEN}✅ MongoDB is running on port 27017${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running on port 27017${NC}"

    if command_exists docker; then
        echo -e "${BLUE}Starting MongoDB with Docker...${NC}"
        docker run -d -p 27017:27017 --name mongodb-auth mongo:latest

        # Wait for MongoDB to start
        echo -e "${BLUE}Waiting for MongoDB to start...${NC}"
        sleep 10

        if port_in_use 27017; then
            echo -e "${GREEN}✅ MongoDB started successfully${NC}"
        else
            echo -e "${RED}❌ Failed to start MongoDB${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Please start MongoDB manually or install Docker${NC}"
        exit 1
    fi
fi

# Check for port conflicts
echo -e "${BLUE}Checking for port conflicts...${NC}"

if port_in_use 3001; then
    echo -e "${RED}❌ Port 3001 is already in use (needed for Login Service)${NC}"
    echo "Please stop the service using port 3001 and try again."
    exit 1
fi

if port_in_use 3002; then
    echo -e "${RED}❌ Port 3002 is already in use (needed for Logout Service)${NC}"
    echo "Please stop the service using port 3002 and try again."
    exit 1
fi

echo -e "${GREEN}✅ Ports 3001 and 3002 are available${NC}"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"

echo -e "${BLUE}Installing Login Service dependencies...${NC}"
cd login-service
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✅ Login Service dependencies already installed${NC}"
fi

echo -e "${BLUE}Installing Logout Service dependencies...${NC}"
cd ../logout-service
if [ ! -d "node_modules" ]; then
    npm install
else
    echo -e "${GREEN}✅ Logout Service dependencies already installed${NC}"
fi

cd ..

# Check environment files
echo -e "${BLUE}Checking environment configuration...${NC}"

if [ ! -f "login-service/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating Login Service .env file from template...${NC}"
    cp login-service/.env.example login-service/.env
fi

if [ ! -f "logout-service/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating Logout Service .env file from template...${NC}"
    cp logout-service/.env.example logout-service/.env
fi

echo -e "${GREEN}✅ Environment files ready${NC}"

# Start services
echo -e "${BLUE}Starting services...${NC}"

# Start Login Service in background
echo -e "${BLUE}Starting Login Service on port 3001...${NC}"
cd login-service
npm run dev > ../logs/login-service.log 2>&1 &
LOGIN_PID=$!
cd ..

# Wait a moment for Login Service to start
sleep 3

# Start Logout Service in background
echo -e "${BLUE}Starting Logout Service on port 3002...${NC}"
cd logout-service
npm run dev > ../logs/logout-service.log 2>&1 &
LOGOUT_PID=$!
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Store PIDs for cleanup
echo $LOGIN_PID > logs/login-service.pid
echo $LOGOUT_PID > logs/logout-service.pid

# Wait for services to start
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 5

# Check if services are running
if port_in_use 3001; then
    echo -e "${GREEN}✅ Login Service started successfully on http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Failed to start Login Service${NC}"
    echo "Check logs/login-service.log for details"
    exit 1
fi

if port_in_use 3002; then
    echo -e "${GREEN}✅ Logout Service started successfully on http://localhost:3002${NC}"
else
    echo -e "${RED}❌ Failed to start Logout Service${NC}"
    echo "Check logs/logout-service.log for details"
    kill $LOGIN_PID 2>/dev/null
    exit 1
fi

# Success message
echo -e "${GREEN}"
echo "🎉 Authentication Microservices started successfully!"
echo ""
echo "Services:"
echo "• Login Service:  http://localhost:3001"
echo "• Logout Service: http://localhost:3002"
echo ""
echo "Health Checks:"
echo "• Login:  http://localhost:3001/health"
echo "• Logout: http://localhost:3002/health"
echo ""
echo "API Endpoints:"
echo "• Register: POST http://localhost:3001/api/auth/register"
echo "• Login:    POST http://localhost:3001/api/auth/login"
echo "• Profile:  GET  http://localhost:3001/api/auth/me"
echo "• Logout:   POST http://localhost:3002/api/logout"
echo ""
echo "Logs:"
echo "• Login Service:  tail -f logs/login-service.log"
echo "• Logout Service: tail -f logs/logout-service.log"
echo ""
echo "To stop services: ./stop-services.sh"
echo -e "${NC}"

# Create stop script
cat > stop-services.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Authentication Microservices..."

# Read PIDs and kill processes
if [ -f "logs/login-service.pid" ]; then
    LOGIN_PID=$(cat logs/login-service.pid)
    kill $LOGIN_PID 2>/dev/null && echo "✅ Login Service stopped"
    rm -f logs/login-service.pid
fi

if [ -f "logs/logout-service.pid" ]; then
    LOGOUT_PID=$(cat logs/logout-service.pid)
    kill $LOGOUT_PID 2>/dev/null && echo "✅ Logout Service stopped"
    rm -f logs/logout-service.pid
fi

echo "🏁 All services stopped"
EOF

chmod +x stop-services.sh

echo -e "${BLUE}Services are running. Press Ctrl+C to view logs or run './stop-services.sh' to stop services.${NC}"