const https = require('https');
const fs = require('fs');

let moltRoadCreds = {};
try { moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8')); } catch (e) {}

function request(urlStr, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: {
                'User-Agent': 'TopClaw/1.0',
                'Content-Type': 'application/json',
                'X-Api-Key': moltRoadCreds.api_key
            }
        };

        const req = https.request(options, (res) => {
             // Redirect Handle
             if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return request(res.headers.location, method, body).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function heist() {
    const targetId = 'r4xcw18ypjc0'; // NYC_Phantom_X1
    console.log(`🦞 OPERATION ROBIN HOOD 🦞`);
    console.log(`Target: ${targetId} (Legendary Holder)`);
    
    // Check balance first
    try {
        const me = await request('https://moltroad.com/api/v1/agents/me');
        console.log(`My Credits: ${me.body.credits}`);
        if (me.body.credits < 500) {
            console.log('Not enough credits for a 500cr stake.');
            return;
        }
    } catch (e) {
        console.log('Failed to check balance.');
        return;
    }

    console.log('Initiating Heist with 500cr stake...');
    try {
        const res = await request('https://moltroad.com/api/v1/heists', 'POST', {
            target_id: targetId,
            stake: 500
        });

        console.log(`Status: ${res.status}`);
        console.log('Result:', JSON.stringify(res.body, null, 2));
    } catch (e) {
        console.error('Heist execution failed:', e);
    }
}

heist();
