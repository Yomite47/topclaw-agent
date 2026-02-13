const https = require('https');
const fs = require('fs');

// Helpers
function request(hostname, path, method, headers, body = null) {
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
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function report() {
    console.log('=== 📊 STATUS REPORT ===\n');

    // 1. FINANCIAL STATUS (MoltRoad)
    try {
        if (fs.existsSync('moltroad-credentials.json')) {
            const mrCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
            const res = await request('moltroad.com', '/api/v1/agents/me', 'GET', {
                'X-Api-Key': mrCreds.api_key
            });
            if (res.status === 200) {
                const me = res.body;
                console.log(`💰 [MoltRoad] Credits: ${me.credits}`);
                console.log(`   Rank: ${me.rank || 'None'} | Verified: ${me.verified}`);
                
                // Fetch Stash for details
                try {
                    const stashRes = await request('moltroad.com', '/api/v1/stash', 'GET', {
                        'X-Api-Key': mrCreds.api_key
                    });
                    const items = stashRes.body.items || stashRes.body.data || stashRes.body || [];
                    if (Array.isArray(items)) {
                        console.log(`📦 [Inventory] Total Items: ${items.length}`);
                        // Count rarities
                        const counts = {};
                        items.forEach(i => {
                            const r = i.rarity || 'common';
                            counts[r] = (counts[r] || 0) + 1;
                        });
                        Object.keys(counts).forEach(r => {
                            console.log(`   - ${r}: ${counts[r]}`);
                        });
                        // List Legendaries/Mythics
                        const valuables = items.filter(i => ['legendary', 'mythic', 'rare'].includes(i.rarity));
                        if (valuables.length > 0) {
                            console.log('   💎 Valuables:');
                            valuables.forEach(v => console.log(`      * ${v.name} (${v.rarity})`));
                        }
                    }
                } catch (e) {
                    console.log(`   (Failed to fetch inventory details: ${e.message})`);
                }

            } else {
                console.log(`❌ [MoltRoad] Failed to fetch status: ${res.status}`);
            }
        } else {
            console.log('⚠️ [MoltRoad] No credentials file found.');
        }
    } catch (e) {
        console.log(`❌ [MoltRoad] Error: ${e.message}`);
    }

    // 2. DEPLOYMENT STATUS (SendClaw -> Railway Emails)
    console.log('\n📧 [Deployment Check]');
    try {
        if (fs.existsSync('sendclaw-credentials.json')) {
            const scCreds = JSON.parse(fs.readFileSync('sendclaw-credentials.json', 'utf8'));
            const res = await request('sendclaw.com', '/api/mail/messages?limit=10', 'GET', {
                'X-Api-Key': scCreds.apiKey
            });
            
            if (res.status === 200) {
                const messages = res.body.messages || res.body; // Handle { messages: [] } or []
                const railwayMsgs = messages.filter(m => 
                    (m.from && m.from.includes('railway')) || 
                    (m.subject && m.subject.toLowerCase().includes('railway')) ||
                    (m.body && m.body.toLowerCase().includes('railway'))
                );
                
                if (railwayMsgs.length > 0) {
                    console.log(`   Found ${railwayMsgs.length} Railway emails.`);
                    const latest = railwayMsgs[0];
                    console.log(`   Latest: "${latest.subject}" (${latest.receivedAt || 'Unknown Date'})`);
                    console.log(`   Preview: ${latest.body.substring(0, 100)}...`);
                } else {
                    console.log('   No recent Railway emails found.');
                }
            } else {
                console.log(`❌ [SendClaw] Failed to fetch emails: ${res.status}`);
            }
        } else {
            console.log('⚠️ [SendClaw] No credentials file found.');
        }
    } catch (e) {
        console.log(`❌ [SendClaw] Error: ${e.message}`);
    }

    // 3. OFFLINE/ONLINE STATUS
    console.log('\n🤖 [Agent Status]');
    console.log('   Local: Active (You are here)');
    console.log('   Railway: Status depends on above emails. If "Build Successful", it is running.');

}

report();