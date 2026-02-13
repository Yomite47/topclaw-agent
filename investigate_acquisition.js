const https = require('https');
const fs = require('fs');

// Load credentials if available, otherwise just public checks
let moltRoadCreds = {};
try { moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8')); } catch (e) {}

let moltBookCreds = {};
try { moltBookCreds = JSON.parse(fs.readFileSync('moltbook-credentials.json', 'utf8')); } catch (e) {}

function request(hostname, path, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method,
            headers: {
                'User-Agent': 'TopClaw/1.0',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            // Handle Redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const newUrl = new URL(res.headers.location);
                return request(newUrl.hostname, newUrl.pathname + newUrl.search, method, headers).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data, headers: res.headers });
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function investigate() {
    console.log('--- 1. Inspecting /verify Page ---');
    try {
        const res = await request('sellyoursouls.com', '/verify');
        console.log('Status:', res.status);
        if (res.status === 200) {
            const html = res.body;
            // Look for links or scripts
            const links = (html.match(/href=["'](.*?)["']/g) || []).map(l => l.replace(/href=["']|["']/g, ''));
            const scripts = (html.match(/src=["'](.*?)["']/g) || []).map(s => s.replace(/src=["']|["']/g, ''));
            
            console.log('Found Links:', links.filter(l => !l.startsWith('#') && !l.startsWith('css')));
            
            // Check for keywords in HTML
            if (html.toLowerCase().includes('mint')) console.log('KEYWORD DETECTED: "mint"');
            if (html.toLowerCase().includes('buy')) console.log('KEYWORD DETECTED: "buy"');
            if (html.toLowerCase().includes('market')) console.log('KEYWORD DETECTED: "market"');
        }
    } catch (e) {
        console.error('Verify page check failed:', e.message);
    }

    console.log('\n--- 2. Searching MoltRoad Market ---');
    if (moltRoadCreds.api_key) {
        try {
            // Check Market Listings
            console.log('Checking /market...');
            const res = await request('moltroad.com', '/api/v1/market?limit=100', 'GET', {
                'X-Api-Key': moltRoadCreds.api_key
            });
            
            if (res.status === 200) {
                const items = JSON.parse(res.body).items || JSON.parse(res.body).data || [];
                const candidates = items.filter(i => {
                    const txt = (i.name + i.description).toLowerCase();
                    return txt.includes('soul') || txt.includes('whoami') || txt.includes('ordinal');
                });
                
                if (candidates.length > 0) {
                    console.log('FOUND ITEMS ON MOLTROAD:');
                    candidates.forEach(c => console.log(`- ${c.name}: ${c.price} credits`));
                } else {
                    console.log('No "WhoAmI" or "Soul" items found on MoltRoad.');
                }
            } else {
                console.log('MoltRoad Error:', res.status);
            }
        } catch (e) {
            console.error('MoltRoad check failed:', e.message);
        }
    } else {
        console.log('Skipping MoltRoad (no credentials).');
    }

    console.log('\n--- 3. Scanning Moltbook ---');
    try {
        const res = await request('moltbook.com', '/api/v1/posts?limit=20', 'GET', {
            'Authorization': `Bearer ${moltBookCreds.api_key}`
        });
        
        if (res.status === 200) {
            const data = JSON.parse(res.body);
            const posts = data.posts || [];
            
            console.log(`Scanning ${posts.length} posts...`);
            
            const keywords = ['whoami', 'soul', 'ordinal', 'market', 'mint', 'breach'];
            const relevant = posts.filter(p => keywords.some(k => (p.content || '').toLowerCase().includes(k)));
            
            if (relevant.length > 0) {
                console.log('RELEVANT POSTS:');
                relevant.forEach(p => console.log(`- [${p.author_name}] ${p.content} (ID: ${p.id})`));
            } else {
                console.log('No relevant posts found.');
                // Log first 3 just in case
                if (posts.length > 0) {
                    console.log('Recent chatter:');
                    posts.slice(0, 3).forEach(p => console.log(`- [${p.author_name}] ${p.content}`));
                }
            }
        } else {
            console.log('Moltbook Error:', res.status);
        }
    } catch (e) {
        console.error('Moltbook scan failed:', e);
    }
}

investigate();