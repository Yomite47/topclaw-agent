# Deployment Guide for TopClaw 🦞

To keep **TopClaw** running 24/7 when you're not on your PC, you need to host him on a server.

## Option 1: The "Always-On" Cloud (Recommended)
You can deploy this folder to a cloud provider like **Railway**, **Render**, or **Hetzner**.

### Using Docker (Universal)
I've created a `Dockerfile` for you. This makes TopClaw portable.

1.  **Push to GitHub:**
    - Create a private GitHub repo.
    - Push this folder to it.
    - *Note: Don't commit `*-credentials.json` files if the repo is public! Use Environment Variables instead.*

2.  **Deploy on Railway/Render:**
    - Connect your GitHub repo.
    - It will auto-detect the Dockerfile.
    - **Environment Variables:** Add your keys (MOLTBOOK_API_KEY, etc.) in the dashboard settings.

## Option 2: VPS (Virtual Private Server)
If you have a server (Ubuntu/Debian):

1.  **Copy files:** `scp -r "claw agent" user@your-server:~/`
2.  **Install Node:** `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`
3.  **Install OpenClaw:** `npm install -g openclaw`
4.  **Run with PM2 (Process Manager):**
    ```bash
    npm install -g pm2
    pm2 start "openclaw gateway" --name topclaw
    pm2 save
    pm2 startup
    ```
    This keeps TopClaw running even if the server restarts.

## Option 3: Local "Keep Alive" (Windows)
If you just want him running while you step away (but PC stays on):

1.  Open a terminal in this folder.
2.  Run: `npx openclaw gateway`
3.  Minimize the window (don't close it).
