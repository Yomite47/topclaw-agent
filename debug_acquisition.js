const https = require('https');
const fs = require('fs');

const breachUrl = 'https://sellyoursouls.com/api/soul/captcha?key=hull-breach-6f108ea887e05228fc446f92fc2fa2ee';
const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
const moltBookCreds = JSON.parse(fs.readFileSync('moltbook-credentials.json', 'utf8'));

function request(url, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: {
                'User-Agent': 'TopClaw/1.0',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return request(res.headers.location, method, headers).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function debug() {
    console.log('--- 1. Probing Breach URL ---');
    try {
        const res = await request(breachUrl);
        console.log('Status:', res.status);
        console.log('Body:', res.body);
    } catch (e) {
        console.error('Breach probe failed:', e);
    }

    console.log('\n--- 2. Checking MoltRoad (with correct key) ---');
    // Note: Credentials file has 'api_key', but MoltRoad might expect 'Bearer <token>' or 'x-api-key'.
    // Looking at autonomous_trader.js, it uses 'Authorization: Bearer <token>' 
    // BUT the file has "api_key". Wait.
    // Let's try using api_key as the token.
    try {
        const res = await request('https://moltroad.com/api/v1/items?limit=50', 'GET', {
            'Authorization': `Bearer ${moltRoadCreds.api_key}`
        });
        console.log('Status:', res.status);
        if (res.status === 200) {
             const data = JSON.parse(res.body);
             const items = data.data || data; // Handle { data: [...] } or [...]
             const souls = items.filter(i => (i.name + i.description).toLowerCase().includes('soul') || i.name.toLowerCase().includes('whoami'));
             if (souls.length > 0) {
                 souls.forEach(s => console.log(`FOUND: ${s.name} (${s.price}) - ${s.description}`));
             } else {
                 console.log('No souls found on MoltRoad.');
             }
        } else {
            console.log('Error Body:', res.body.substring(0, 200));
        }
    } catch (e) {
        console.error('MoltRoad failed:', e);
    }

    console.log('\n--- 3. Checking Moltbook Feed ---');
    try {
        const res = await request('https://moltbook.com/api/v1/posts?limit=10', 'GET', {
            'Authorization': `Bearer ${moltBookCreds.api_key}`
        });
        console.log('Status:', res.status);
        if (res.status === 200) {
            const data = JSON.parse(res.body);
            // Log structure
            console.log('Response Keys:', Object.keys(data));
            if (Array.isArray(data)) console.log('Is Array: Yes');
            else if (Array.isArray(data.data)) console.log('Has .data Array: Yes');
            
            // Search
            const posts = Array.isArray(data) ? data : (data.data || []);
            const hints = posts.filter(p => JSON.stringify(p).toLowerCase().includes('sellyoursouls'));
            if (hints.length > 0) hints.forEach(h => console.log(`HINT: [${h.author_name}] ${h.content}`));
            else console.log('No hints in recent posts.');
        }
    } catch (e) {
        console.error('Moltbook failed:', e);
    }
}

debug();