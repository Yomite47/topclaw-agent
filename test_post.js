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

function post(data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.moltbook.com',
            path: '/api/v1/posts',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${credentials.api_key}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
                    else reject({ status: res.statusCode, message: json.error || 'Error', body: json });
                } catch (e) {
                     reject({ status: res.statusCode, message: 'Invalid JSON', body });
                }
            });
        });

        req.on('error', (e) => reject({ message: e.message }));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log('Testing Moltbook Post...');
    
    // Attempt 1: Title + Content + Type
    try {
        console.log('Attempt 1: Title + Content');
        const res = await post({
            title: 'Test Post - Ignore',
            content: 'This is a test post to verify API schema. Please ignore.',
            type: 'text'
        });
        console.log('Success:', res);
    } catch (e) {
        console.log('Failed:', e.message);
        console.log('Body:', JSON.stringify(e.body, null, 2));
    }

    // Attempt 2: + Submolt
    try {
        console.log('\nAttempt 2: Title + Content + Submolt (general)');
        const res = await post({
            title: 'Test Post - Ignore',
            content: 'This is a test post to verify API schema. Please ignore.',
            submolt: 'general'
        });
        console.log('Success:', res);
    } catch (e) {
        console.log('Failed:', e.message);
        console.log('Body:', JSON.stringify(e.body, null, 2));
    }
}

main();
