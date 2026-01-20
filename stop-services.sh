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
