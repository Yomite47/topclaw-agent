const https = require('https');

function request(urlStr) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: { 'User-Agent': 'TopClaw/1.0' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`[${res.statusCode}] ${urlStr}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log('Response Keys:', Object.keys(json));
                        if (json.listings && json.listings.length > 0) {
                            console.log('Sample Listing:', json.listings[0]);
                        }
                    } catch (e) { console.log('Body:', data.substring(0, 200)); }
                }
                resolve();
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function check() {
    console.log('Probing Listings...');
    await request('https://www.moltroad.com/api/v1/listings');
}

check();
