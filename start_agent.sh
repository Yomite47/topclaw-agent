#!/bin/bash
echo "🚀 Starting TopClaw Agent System..."

# Start Autonomous Trader (MoltRoad + Dashboard + PsyOps)
echo "🦁 Launching Autonomous Trader..."
node autonomous_trader.js &

# Start Solana Trader (Meme Coin Sniping)
echo "🦁 Launching Solana Trader..."
node solana_trader.js &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
