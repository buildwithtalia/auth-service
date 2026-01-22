# Mock Server Configuration Guide

## Overview
The Auth Service API collection has been successfully configured to work with your local mock server running at `http://localhost:4500`.

## What Was Changed

### 1. Collection Variables Updated
The collection's default variables have been set to point to the mock server:
- `baseUrl`: `http://localhost`
- `loginServicePort`: `4500` (mock server port)
- `logoutServicePort`: `4500` (mock server port)

### 2. Environment Files Created
Two environment files have been created to make switching between mock and real services easy:

#### **Local Mock Server** Environment
- **File**: `postman/environments/Local Mock Server.postman_environment.json`
- **Configuration**:
  - `baseUrl`: `http://localhost`
  - `loginServicePort`: `4500`
  - `logoutServicePort`: `4500`
- **Use this when**: Testing with the local mock server

#### **Real Services** Environment
- **File**: `postman/environments/Real Services.postman_environment.json`
- **Configuration**:
  - `baseUrl`: `http://localhost`
  - `loginServicePort`: `3001`
  - `logoutServicePort`: `3002`
- **Use this when**: Testing with actual login and logout services

## How to Use

### Using the Mock Server (Default)
The collection is now configured by default to use the mock server. Simply:
1. Make sure your local mock server is running at `http://localhost:4500`
2. Send requests from the collection - they will automatically use the mock server

### Switching Between Mock and Real Services

#### Option 1: Using Environments (Recommended)
1. In Postman, click the environment dropdown (top right)
2. Select **"Local Mock Server"** to use the mock server
3. Select **"Real Services"** to use the actual services
4. Select **"No Environment"** to use the collection's default values (currently set to mock)

#### Option 2: Manually Update Collection Variables
1. Open the collection
2. Go to the **Variables** tab
3. Update the port values:
   - For mock server: Set both ports to `4500`
   - For real services: Set `loginServicePort` to `3001` and `logoutServicePort` to `3002`

## Request URL Structure
All requests in the collection use this URL pattern:
```
{{baseUrl}}:{{loginServicePort}}/path
{{baseUrl}}:{{logoutServicePort}}/path
```

This resolves to:
- **Mock Server**: `http://localhost:4500/path`
- **Real Services**: 
  - Login Service: `http://localhost:3001/path`
  - Logout Service: `http://localhost:3002/path`

## Testing the Configuration

### Test with Mock Server
1. Ensure the local mock server is running at `http://localhost:4500`
2. Select "Local Mock Server" environment (or use no environment)
3. Send a request like "Health Check" from the Login Service folder
4. You should receive a response from the mock server

### Test with Real Services
1. Ensure both services are running:
   - Login Service on port 3001
   - Logout Service on port 3002
2. Select "Real Services" environment
3. Send requests - they will hit the actual services

## Files Modified/Created

### Modified
- `postman/collections/Auth Service API.postman_collection.json`
  - Updated collection variables to default to mock server
  - Added descriptions to help users understand the configuration

### Created
- `postman/environments/Local Mock Server.postman_environment.json`
- `postman/environments/Real Services.postman_environment.json`
- `MOCK_SERVER_SETUP.md` (this file)

## Troubleshooting

### Requests failing with connection errors
- **Check**: Is the mock server running at `http://localhost:4500`?
- **Check**: Are you using the correct environment?
- **Check**: Look at the actual URL being sent in the Postman console

### Getting unexpected responses
- **Check**: Which environment is active? The environment variables override collection variables
- **Check**: Does the mock server have examples configured for the endpoints you're testing?

### Want to switch back to real services
- Simply select the "Real Services" environment from the dropdown
- Or manually update the collection variables to use ports 3001 and 3002

## Benefits of This Setup

✅ **Easy Switching**: Change environments to instantly switch between mock and real services  
✅ **No Code Changes**: All requests use variables - no need to edit individual requests  
✅ **Team Friendly**: Share environments with your team for consistent configuration  
✅ **Version Control**: Environment files are in your repository and can be tracked  
✅ **Flexible**: Can override at environment, collection, or even request level if needed

## Next Steps

1. **Activate the Mock Environment**: Select "Local Mock Server" from the environment dropdown
2. **Test a Request**: Try sending the "Health Check" request to verify the mock server responds
3. **Run the Collection**: Use the Collection Runner to test all endpoints against the mock server
4. **Switch When Ready**: Change to "Real Services" environment when you want to test against actual services

---

**Note**: The collection variables serve as defaults when no environment is selected. Environment variables take precedence over collection variables when an environment is active.
