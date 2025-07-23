#!/bin/bash
# Install ngrok for macOS

echo "🔧 Installing ngrok..."

# Check if Homebrew is installed
if command -v brew >/dev/null 2>&1; then
    echo "📦 Installing ngrok via Homebrew..."
    brew install ngrok/ngrok/ngrok
else
    echo "📥 Downloading ngrok manually..."
    
    # Download ngrok for macOS
    curl -s https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.tgz \
        -o /tmp/ngrok.tgz
    
    # Extract and install
    cd /tmp
    tar -xzf ngrok.tgz
    sudo mv ngrok /usr/local/bin/
    
    echo "✅ ngrok installed to /usr/local/bin/ngrok"
fi

echo ""
echo "🔑 To complete setup:"
echo "1. Sign up at https://ngrok.com/"
echo "2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
echo "3. Run: ngrok config add-authtoken YOUR_TOKEN"
echo "4. Then run: ./start-python-tunnel.sh"