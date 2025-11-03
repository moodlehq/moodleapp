#!/bin/bash
# Installation script for Claude Code on the Web
# This runs when a new session starts

set -e  # Exit on error

echo "📦 Installing npm dependencies..."
npm install

echo "🔧 Running gulp build..."
npx gulp || echo "⚠️  Gulp build skipped or failed (non-critical)"

echo "🚀 Starting dev server in background..."
# Run ionic serve in background without opening browser
NODE_ENV=development ionic serve --no-open > /tmp/ionic-serve.log 2>&1 &
IONIC_PID=$!

# Wait a moment for server to initialize
sleep 3

if ps -p $IONIC_PID > /dev/null; then
    echo "✅ Dev server started successfully (PID: $IONIC_PID)"
    echo "📱 Server logs: /tmp/ionic-serve.log"
    echo "🌐 Access the app through the forwarded port (usually 8100)"
    echo "💡 Use 'tail -f /tmp/ionic-serve.log' to monitor server output"
else
    echo "⚠️  Dev server failed to start - check /tmp/ionic-serve.log for details"
fi

echo ""
echo "✅ Setup complete!"
echo "📝 Note: Cordova platforms not installed by default (add manually if needed for builds)"
exit 0
