#!/bin/bash

echo "🔍 Auth Service API Monitor"
echo "=========================="
echo "Monitoring API activity on localhost:3001 and localhost:3002"
echo "Press Ctrl+C to stop"
echo

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Test login service
    login_response=$(curl -w "%{http_code}:%{time_total}" -s -o /dev/null http://localhost:3001/health)
    login_status=$(echo $login_response | cut -d: -f1)
    login_time=$(echo $login_response | cut -d: -f2)

    # Test logout service
    logout_response=$(curl -w "%{http_code}:%{time_total}" -s -o /dev/null http://localhost:3002/health)
    logout_status=$(echo $logout_response | cut -d: -f1)
    logout_time=$(echo $logout_response | cut -d: -f2)

    # Display results
    if [ "$login_status" = "200" ]; then
        echo "[$timestamp] ✅ Login Service: ${login_time}s"
    else
        echo "[$timestamp] ❌ Login Service: HTTP $login_status"
    fi

    if [ "$logout_status" = "200" ]; then
        echo "[$timestamp] ✅ Logout Service: ${logout_time}s"
    else
        echo "[$timestamp] ❌ Logout Service: HTTP $logout_status"
    fi

    echo "---"
    sleep 5
done