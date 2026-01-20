#!/bin/bash

echo "🚀 Deploying Postman Insights Agent updates..."

# Apply updated insights agent configuration with enhanced RBAC permissions
echo "📝 Applying updated insights agent configuration..."
kubectl apply -f postman-insights-agent-daemonset.yaml

# Apply updated service configurations with enhanced metadata
echo "🔧 Applying updated service configurations..."
kubectl apply -f k8s/services/simple-login-service.yaml
kubectl apply -f k8s/services/simple-logout-service.yaml

# Wait for insights agent to restart
echo "⏳ Waiting for insights agent to restart..."
kubectl rollout restart daemonset/postman-insights-agent -n postman-insights-namespace
kubectl rollout status daemonset/postman-insights-agent -n postman-insights-namespace

# Check that both services are properly labeled
echo "🏷️  Checking service labels and annotations..."
echo "Login Service:"
kubectl get service simple-login-service -n auth-system -o yaml | grep -A 20 "metadata:"
echo ""
echo "Logout Service:"
kubectl get service simple-logout-service -n auth-system -o yaml | grep -A 20 "metadata:"

# Check insights agent status
echo "🔍 Checking insights agent status..."
kubectl get pods -n postman-insights-namespace -l name=postman-insights-agent

# Check insights agent logs for service discovery
echo "📊 Recent insights agent logs (looking for service discovery):"
kubectl logs -n postman-insights-namespace -l name=postman-insights-agent --tail=50 | grep -i "service\|discovery\|auth-system" || echo "No service discovery logs found yet"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Next Steps:"
echo "1. Wait 2-3 minutes for the agent to rediscover services"
echo "2. Check your Postman workspace at: https://go.postman.co/workspace"
echo "3. Navigate to: APIs > Insights > Service Map for project: svc_69DlVp7BRWhfyRRpS8fcCU"
echo "4. You should now see both 'simple-login-service' and 'simple-logout-service' in the graph"
echo ""
echo "🔧 If services still don't appear:"
echo "- Check agent logs: kubectl logs -n postman-insights-namespace -l name=postman-insights-agent"
echo "- Verify services are running: kubectl get services -n auth-system"
echo "- Check RBAC permissions: kubectl describe clusterrole postman-insights-read-only-role"