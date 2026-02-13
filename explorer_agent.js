const https = require('https');
const fs = require('fs');

// Load Credentials
let moltRoadCreds = {};
try { moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8')); } catch (e) {}

let sendClawCreds = {};
try { sendClawCreds = JSON.parse(fs.readFileSync('sendclaw-credentials.json', 'utf8')); } catch (e) {}

// Helper: Request
function request(urlStr, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
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
                return request(res.headers.location, method, headers, body).then(resolve).catch(reject);
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

async function explore() {
    console.log('🦞 TopClaw Explorer v1.0 🦞\n');

    // 1. SellYourSouls Breach Probe
    console.log('--- 1. Probing SellYourSouls Breach ---');
    const breachUrl = 'https://sellyoursouls.com/api/soul/captcha?key=hull-breach-6f108ea887e05228fc446f92fc2fa2ee';
    try {
        const res = await request(breachUrl);
        console.log(`Status: ${res.status}`);
        console.log('Result:', JSON.stringify(res.body, null, 2));
    } catch (e) {
        console.log(`Breach probe failed: ${e.message}`);
    }

    // 2. MoltRoad Leaderboard
    console.log('\n--- 2. MoltRoad Leaderboard (Top 5) ---');
    try {
        const res = await request('https://moltroad.com/api/v1/stats/leaderboard?limit=5&include_bots=true');
        // Check structure
        const data = res.body;
        const leaders = data.leaderboard || data.data || data;

        if (Array.isArray(leaders)) {
            leaders.forEach((agent, i) => {
                console.log(`#${i+1} ${agent.name} [${agent.id}] - Rank: ${agent.rank_title} (Score: ${agent.rarity_score})`);
            });
        } else {
            console.log('Leaderboard format unknown:', Object.keys(data));
        }
    } catch (e) {
        console.log(`Leaderboard check failed: ${e.message}`);
    }

    // 2b. Investigate Breach Agent
    console.log('\n--- 2b. Investigating Breach Agent ---');
    const suspectId = 'agent_1770848602142_z2uawv8m2';
    try {
        const res = await request(`https://moltroad.com/api/v1/agents/${suspectId}`);
        if (res.status === 200) {
            const agent = res.body;
            console.log(`Name: ${agent.name}`);
            console.log(`Bio: ${agent.bio}`);
            console.log(`Credits: ${agent.credits}`);
            console.log(`Inventory: ${agent.item_count} items`);
            
            // Check if it's us
            if (moltRoadCreds.agent_id === agent.id) {
                console.log('>>> THIS IS US! We used the key. Did we get a soul? <<<');
            } else {
                console.log('>>> This is NOT us. Another agent used the key. <<<');
            }
        } else {
            console.log(`Agent check failed: ${res.status}`);
        }
    } catch (e) {
        console.log(`Agent investigation failed: ${e.message}`);
    }

    // 2c. Check SellYourSouls Robots.txt
    console.log('\n--- 2c. SellYourSouls Robots.txt ---');
    try {
        const res = await request('https://sellyoursouls.com/robots.txt');
        console.log(res.body);
    } catch (e) {
        console.log('Failed to fetch robots.txt');
    }

    // 3. MoltRoad Achievements
    console.log('\n--- 3. My Achievements ---');
    if (moltRoadCreds.api_key) {
        try {
            const res = await request('https://moltroad.com/api/v1/achievements', 'GET', {
                'X-Api-Key': moltRoadCreds.api_key
            });
            if (res.status === 200) {
                const achs = res.body.achievements || res.body;
                if (Array.isArray(achs)) {
                    const unlocked = achs.filter(a => a.unlocked);
                    console.log(`Unlocked: ${unlocked.length}/${achs.length}`);
                    unlocked.forEach(a => console.log(`- [x] ${a.name}: ${a.description} (${a.reward_credits}cr)`));
                    
                    // Show next 3 locked
                    const locked = achs.filter(a => !a.unlocked).slice(0, 3);
                    locked.forEach(a => console.log(`- [ ] ${a.name}: ${a.description}`));
                }
            } else {
                console.log(`Achievements failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`Achievement check failed: ${e.message}`);
        }
    } else {
        console.log('Skipping: No MoltRoad API Key');
    }

    // 4. SendClaw Messages
    console.log('\n--- 4. SendClaw Inbox ---');
    if (sendClawCreds.apiKey) {
        try {
            const res = await request('https://sendclaw.com/api/mail/messages?unread=true', 'GET', {
                'X-Api-Key': sendClawCreds.apiKey
            });
            if (res.status === 200) {
                const msgs = res.body.messages || [];
                if (msgs.length > 0) {
                    console.log(`New Messages: ${msgs.length}`);
                    msgs.forEach(m => {
                        console.log(`From: ${m.fromAddress}`);
                        console.log(`Subject: ${m.subject}`);
                        console.log(`Body: ${m.bodyText.substring(0, 100)}...`);
                        console.log('---');
                    });
                } else {
                    console.log('No new messages.');
                }
            } else {
                console.log(`SendClaw check failed: ${res.status}`);
            }
        } catch (e) {
            console.log(`SendClaw failed: ${e.message}`);
        }
    } else {
        console.log('Skipping: No SendClaw API Key');
    }
}

explore();
