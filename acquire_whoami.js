const https = require('https');
const fs = require('fs');

let moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
let moltBookCreds = JSON.parse(fs.readFileSync('moltbook-credentials.json', 'utf8'));

// Helper
function request(hostname, path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method,
            headers: {
                'User-Agent': 'TopClaw/1.0',
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            // Handle Redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const u = new URL(res.headers.location);
                return request(u.hostname, u.pathname + u.search, method, headers, body).then(resolve).catch(reject);
            }
            
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function execute() {
    console.log('--- 1. Verifying Moltbook Post ---');
    const verifyCode = "moltbook_verify_f4ca671fc1b889e395a4d9acb7ec2323";
    const answer = "37.00"; // 25 + 12
    
    try {
        const res = await request('www.moltbook.com', '/api/v1/verify', 'POST', {
            'Authorization': `Bearer ${moltBookCreds.api_key}`
        }, {
            verification_code: verifyCode,
            answer: answer
        });
        console.log('Verify Status:', res.status);
        console.log('Verify Response:', res.body);
    } catch (e) {
        console.error('Verify failed:', e);
    }

    console.log('\n--- 2. Searching MoltRoad Player Market ---');
    try {
        // Try to get more items
        const res = await request('moltroad.com', '/api/v1/market?limit=50', 'GET', {
            'X-Api-Key': moltRoadCreds.api_key
        });
        
        if (res.status === 200) {
            const market = res.body; 
            const listings = Array.isArray(market) ? market : (market.data || []);
            
            console.log(`Scanning ${listings.length} listings...`);
            
            if (listings.length > 0) {
                console.log('Sample Listings:');
                listings.slice(0, 5).forEach(l => console.log(`- [${l.item_name}] ${l.price}c (Seller: ${l.seller_name})`));
            }

            const target = listings.find(l => 
                l.item_name.toLowerCase().includes('whoami') || 
                l.item_name.toLowerCase().includes('soul')
            );
            
            if (target) {
                console.log(`FOUND TARGET! ${target.item_name}`);
                console.log(`Price: ${target.price}`);
                console.log(`Seller: ${target.seller_name}`);
                console.log(`Listing ID: ${target.listing_id}`);
                
                // Check Balance
                const me = await request('moltroad.com', '/api/v1/agents/me', 'GET', {
                    'X-Api-Key': moltRoadCreds.api_key
                });
                console.log(`My Balance: ${me.body.credits}`);
                
                if (me.body.credits >= target.price) {
                    console.log('Attempting to BUY...');
                    const buyRes = await request('moltroad.com', `/api/v1/market/buy/${target.listing_id}`, 'POST', {
                        'X-Api-Key': moltRoadCreds.api_key
                    });
                    console.log('Buy Result:', buyRes.status, buyRes.body);
                    if (buyRes.status === 200 || buyRes.status === 201) {
                         console.log('SUCCESS! Ordinal acquired.');
                    }
                } else {
                    console.log('Not enough credits!');
                }
            } else {
                console.log('No WhoAmI ordinal found in player market.');
            }
        } else {
            console.log('Market Fetch Failed:', res.status);
        }
    } catch (e) {
        console.error('Market search failed:', e);
    }
}

execute();