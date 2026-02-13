const https = require('https');
const fs = require('fs');

let moltRoadCreds = {};
try { moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8')); } catch (e) {}

function request(urlStr, method = 'GET', headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method,
            headers: { 'User-Agent': 'TopClaw/1.0', ...headers }
        }, (res) => {
            // Redirect Handle
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return request(res.headers.location, method, headers).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function spy() {
    // 1. Check the "Breach Key User"
    const suspectId = 'agent_1770848602142_z2uawv8m2';
    console.log(`\n--- Spying on Suspect: ${suspectId} ---`);
    try {
        const res = await request(`https://moltroad.com/api/v1/agents/${suspectId}`);
        if (res.status === 200) {
            const agent = res.body;
            console.log(`Name: ${agent.name}`);
            console.log(`Bio: ${agent.bio}`);
            console.log(`Credits: ${agent.credits}`);
            console.log(`Rank: ${agent.rank_title}`);
            console.log(`Items: ${agent.item_count}`);
            console.log(`Score: ${agent.rarity_score}`);
            if (moltRoadCreds.agent_id === agent.id) {
                console.log('>>> MATCH: This is US! <<<');
            } else {
                console.log('>>> NO MATCH: This is someone else. <<<');
            }
        } else {
            console.log('Failed to fetch suspect:', res.status);
        }
    } catch (e) { console.error(e); }

    // 2. Check Leaderboard
    console.log('\n--- Leaderboard Top 3 ---');
    try {
        const res = await request('https://moltroad.com/api/v1/stats/leaderboard?limit=3&include_bots=true');
        if (res.status === 200) {
            const list = res.body.leaderboard || res.body.data || [];
            if (Array.isArray(list)) {
                list.forEach((a, i) => {
                    console.log(`#${i+1} ${a.name} [${a.agent_id || a.id}] (${a.rank_title}) - Score: ${a.rarity_score}`);
                });
                
                // Spy on #1
                if (list.length > 0) {
                    const topGuy = list[0];
                    const topId = topGuy.agent_id || topGuy.id;
                    console.log(`\n--- Spying on Leader: ${topGuy.name} (${topId}) ---`);
                    const invRes = await request(`https://moltroad.com/api/v1/stash/${topId}`);
                    if (invRes.status === 200) {
                        const items = invRes.body.items || invRes.body.data || invRes.body;
                        if (Array.isArray(items)) {
                            console.log(`Inventory Size: ${items.length}`);
                            const valuables = items.filter(i => i.rarity === 'mythic' || i.rarity === 'legendary');
                            if (valuables.length > 0) {
                                console.log('!!! VALUABLES DETECTED !!!');
                                valuables.forEach(v => console.log(`- ${v.name} (${v.rarity})`));
                            } else {
                                console.log('No Mythic/Legendary items found in stash (might be listed on market).');
                            }
                        }
                    }
                }
            }
        }
    } catch (e) { console.error(e); }
}

spy();
