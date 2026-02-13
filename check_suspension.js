const https = require('https');
const fs = require('fs');

const CONFIG = {
    moltbookCredentialsFile: './moltbook-credentials.json'
};

function loadMoltbookCredentials() {
    try {
        if (process.env.MOLTBOOK_API_KEY) {
            return { api_key: process.env.MOLTBOOK_API_KEY };
        }
        if (fs.existsSync(CONFIG.moltbookCredentialsFile)) {
            return JSON.parse(fs.readFileSync(CONFIG.moltbookCredentialsFile, 'utf8'));
        }
    } catch (e) { console.log('No Moltbook creds.'); }
    return null;
}

const creds = loadMoltbookCredentials();

if (!creds) {
    console.log("No credentials found.");
    process.exit(1);
}

const options = {
    hostname: 'www.moltbook.com',
    port: 443,
    path: '/api/v1/posts',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creds.api_key}`
    }
};

console.log("Attempting to post a test message...");

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response Body: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`Request Error: ${e.message}`);
});

req.write(JSON.stringify({ content: "System check. Ignore." }));
req.end();
