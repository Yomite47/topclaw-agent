const https = require('https');
const fs = require('fs');

const CONFIG = {
    moltbookCredentialsFile: './moltbook-credentials.json'
};

let credentials = null;

try {
    if (fs.existsSync(CONFIG.moltbookCredentialsFile)) {
        credentials = JSON.parse(fs.readFileSync(CONFIG.moltbookCredentialsFile, 'utf8'));
    }
} catch (e) { }

if (!credentials) {
    console.log('No Moltbook credentials found.');
    process.exit(0);
}

const options = {
    hostname: 'www.moltbook.com',
    path: '/api/v1/posts?limit=1',
    method: 'GET',
    headers: {
        'X-Api-Key': credentials.api_key
    }
};

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(body);
            if (json.posts && json.posts.length > 0) {
                console.log('Post Structure:', JSON.stringify(json.posts[0], null, 2));
            } else {
                console.log('No posts found.');
            }
        } catch (e) {
            console.log('Response (not JSON):', body.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
