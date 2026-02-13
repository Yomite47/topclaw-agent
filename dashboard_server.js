const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Enable CORS for local dev flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.url === '/' || req.url === '/dashboard.html') {
        fs.readFile('dashboard.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading dashboard.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/api/state') {
        fs.readFile('dashboard_state.json', (err, data) => {
            if (err) {
                // Return default state if file missing
                const defaultState = {
                    agent: { name: "TopClaw", status: "Initializing...", credits: 0 },
                    logs: ["Waiting for autonomous trader data..."],
                    marketSniper: [],
                    lastUpdate: new Date().toISOString()
                };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(defaultState));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🛡️ WAR ROOM DASHBOARD ONLINE`);
    console.log(`👉 http://localhost:${PORT}`);
});