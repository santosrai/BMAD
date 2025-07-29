# NgRok URL Auto-Detection 🔍

This feature automatically detects your ngrok tunnel URL, eliminating the need to manually copy and paste URLs every time you restart ngrok.

## How It Works

The system provides **3 automatic detection methods**:

1. **Python Service API** (Primary) - The Python service detects its own ngrok tunnel
2. **Local Ngrok API** (Secondary) - Frontend queries ngrok's local API directly  
3. **Localhost Fallback** (Backup) - Falls back to localhost if ngrok isn't running

## Quick Start

### 1. Start Your Services
```bash
# Terminal 1: Start Python service
cd python-langgraph-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start ngrok tunnel (auto-configures Convex)
./start-python-tunnel.sh
```

### 2. Auto-Detect in Frontend
1. Open the application settings
2. Go to "Backend Service Configuration"
3. Click the **"🔍 Auto-Detect"** button
4. The system will automatically find and validate your ngrok URL
5. Click "Save" to store the configuration

## Available Scripts

### `./start-python-tunnel.sh`
- Starts ngrok tunnel for the Python service
- **Automatically configures Convex environment**
- Provides clear setup instructions
- Shows frontend auto-detection guidance

### `./check-ngrok-status.sh` (New!)
- Quick status check for ngrok and Python service
- Shows current tunnel URLs
- Displays Convex configuration
- Provides troubleshooting guidance

```bash
# Check current status
./check-ngrok-status.sh
```

## API Endpoints (Python Service)

The Python service now provides ngrok detection endpoints:

- `GET /api/v1/ngrok/url` - Get current tunnel URL
- `GET /api/v1/ngrok/info` - Detailed tunnel information
- `GET /api/v1/ngrok/status` - Check ngrok service status
- `POST /api/v1/ngrok/refresh` - Force refresh tunnel detection

## Frontend Features

### Auto-Detect Button
- Tries multiple detection methods automatically
- Shows real-time detection status
- Automatically validates detected URLs
- Provides clear error messages if detection fails

### Enhanced Setup Instructions
- Step-by-step guidance for both auto and manual setup
- Clear visual distinction between setup methods
- Updated to highlight the auto-detection feature

## Troubleshooting

### Auto-Detection Fails
1. **Check ngrok is running**: `./check-ngrok-status.sh`
2. **Check Python service**: Visit http://localhost:8000/health/live
3. **Try manual setup**: Copy URL from ngrok output
4. **Check browser console**: Look for detailed error messages

### Common Issues

**"Could not auto-detect ngrok URL"**
- Ensure ngrok is running: `./start-python-tunnel.sh`
- Ensure Python service is running on port 8000
- Check that ngrok is tunneling to port 8000

**"Auto-detection method failed"**
- Check browser developer console for detailed errors
- Try the manual detection methods in order
- Verify network connectivity to localhost:4040 (ngrok API)

**"URL validation failed"**
- The detected URL might not point to a valid Python service
- Ensure the Python service is running and accessible
- Check for firewall or network issues

## Benefits

✅ **No more manual URL copying**  
✅ **Automatic Convex configuration**  
✅ **Multiple fallback detection methods**  
✅ **Real-time validation**  
✅ **Clear status feedback**  
✅ **Easy troubleshooting**  

## Development Workflow

```bash
# 1. Start services (one-time setup)
cd python-langgraph-service && uvicorn app.main:app --reload &
./start-python-tunnel.sh &

# 2. Use auto-detection in frontend
# Click "🔍 Auto-Detect" button in settings

# 3. Check status anytime
./check-ngrok-status.sh

# 4. Restart ngrok (URL changes automatically detected)
# Just click "🔍 Auto-Detect" again - no manual URL copying needed!
```

This eliminates the friction of constantly updating URLs during development! 🚀