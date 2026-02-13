const fs = require('fs');
const https = require('https');

const CONFIG = {
    baseUrl: 'https://www.moltroad.com/api/v1',
    credentialsFile: './moltroad-credentials.json',
    moltbookCredentialsFile: './moltbook-credentials.json'
};

let credentials = null;

function loadCredentials() {
    try {
        if (process.env.MOLTROAD_API_KEY) {
            credentials = { api_key: process.env.MOLTROAD_API_KEY };
            return true;
        }
        if (fs.existsSync(CONFIG.credentialsFile)) {
            credentials = JSON.parse(fs.readFileSync(CONFIG.credentialsFile, 'utf8'));
            return true;
        }
    } catch (e) { console.log('No MoltRoad creds.'); }
    return false;
}

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.baseUrl}${path}`);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': credentials.api_key
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject({ status: res.statusCode, message: json.message || json.error || `Request failed`, body: json });
                    }
                } catch (e) {
                     if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
                     else reject({ status: res.statusCode, message: 'Invalid JSON', body });
                }
            });
        });

        req.on('error', (e) => reject({ message: e.message }));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function main() {
    console.log('📅 TopClaw Daily Task Runner 📅');
    if (!loadCredentials()) {
        console.log('❌ Missing credentials.');
        return;
    }

    // 0. Verify Auth
    console.log('\n--- 0. Verify Auth ---');
    try {
        const me = await request('GET', '/agents/me');
        console.log(`✅ Authenticated as: ${me.name} (Rank: ${me.rank || 'N/A'})`);
        console.log(`Credits: ${me.credits}`);
    } catch (e) {
        console.log(`❌ Auth failed: ${e.message}`);
        return;
    }

    // 1. Daily Claim
    console.log('\n--- 1. Daily Claim ---');
    try {
        const claimRes = await request('POST', '/claims');
        if (typeof claimRes === 'string' && claimRes.includes('Redirecting')) {
             console.log('⚠️ API returned Redirect. Trying redirect URL...');
             // Manual handling if needed, but for now just logging.
        }
        console.log(`✅ Claimed ${claimRes.credits_claimed} credits! Total: ${claimRes.credits_remaining}`);
        console.log(`Next claim at: ${claimRes.next_claim_at}`);
    } catch (e) {
        console.log(`Debug Error Body:`, JSON.stringify(e.body));
        if (e.status === 429) {
            console.log(`⏳ Already claimed. Next claim available in ${e.body.seconds_remaining} seconds.`);
        } else if (e.status === 307 || e.status === 301) {
             console.log(`❌ Redirect detected. Please verify API URL.`);
        } else {
            console.log(`❌ Claim failed: ${e.message} (Status: ${e.status})`);
        }
    }

    // 2. Check Quests
    console.log('\n--- 2. Daily Quests ---');
    try {
        const questRes = await request('GET', '/quests');
        const quests = questRes.quests || [];
        
        if (quests.length === 0) {
            console.log('No active quests.');
        } else {
            quests.forEach(q => {
                const status = q.completed ? '✅ DONE' : `❌ PENDING (${q.progress}/${q.target})`;
                console.log(`- [${q.type}] ${q.description}: ${status} (Reward: ${q.reward}cr)`);
            });
        }
    } catch (e) {
        console.log(`❌ Quest check failed: ${e.message}`);
    }
    
    console.log('\n--- Daily Tasks Complete ---');
}

main();
