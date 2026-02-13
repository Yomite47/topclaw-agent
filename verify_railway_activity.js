const https = require('https');
const fs = require('fs');

const CONFIG = {
    baseUrl: 'https://moltroad.com/api/v1',
    credentialsFile: './moltroad-credentials.json',
    monitorDuration: 60000, // 60 seconds
    checkInterval: 10000 // 10 seconds
};

let credentials = JSON.parse(fs.readFileSync(CONFIG.credentialsFile, 'utf8'));

// Helper: Request
function request(method, path, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlStr = path.startsWith('http') ? path : `${CONFIG.baseUrl}${path}`;
        const url = new URL(urlStr);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': credentials.api_key,
                ...headers
            }
        };

        const req = https.request(url, options, (res) => {
             // Redirects
             if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                 return request(method, res.headers.location, headers).then(resolve).catch(reject);
             }
             let body = '';
             res.on('data', c => body += c);
             res.on('end', () => {
                 try {
                     resolve({ status: res.statusCode, body: JSON.parse(body) });
                 } catch (e) {
                     resolve({ status: res.statusCode, body });
                 }
             });
        });
        req.on('error', reject);
        req.end();
    });
}

async function monitor() {
    console.log('👻 Starting Ghost Activity Monitor...');
    console.log('   (Checking for Railway activity via balance changes)');
    
    // 1. Check Drop Status
    try {
        const drop = await request('GET', '/supplier');
        console.log(`[Supplier] Drop #${drop.body.drop_number} is ${drop.body.active ? 'ACTIVE' : 'INACTIVE'}`);
        if (!drop.body.active) {
            console.log('⚠️ Supplier drop is INACTIVE. Railway agent might be online but wont buy anything.');
            console.log('   Balance check might be inconclusive.');
        }
    } catch (e) { console.log('Supplier check failed'); }

    // 2. Initial Balance
    let startBalance = 0;
    try {
        const me = await request('GET', '/agents/me');
        startBalance = me.body.credits;
        console.log(`[Start] Balance: ${startBalance}`);
    } catch (e) {
        console.log('Initial balance check failed');
        return;
    }

    const endTime = Date.now() + CONFIG.monitorDuration;
    let checks = 0;

    const interval = setInterval(async () => {
        if (Date.now() > endTime) {
            clearInterval(interval);
            console.log('--- Monitor Finished ---');
            return;
        }

        try {
            const me = await request('GET', '/agents/me');
            const current = me.body.credits;
            checks++;
            
            if (current !== startBalance) {
                console.log(`🚨 ACTIVITY DETECTED! Balance changed: ${startBalance} -> ${current}`);
                console.log('   (Since local trader is stopped, this MUST be Railway!)');
                console.log('✅ Railway is CONFIRMED Active.');
                clearInterval(interval);
                process.exit(0);
            } else {
                process.stdout.write('.');
            }
        } catch (e) {
            if (e.status === 429) {
                console.log('\n🚨 RATE LIMIT (429) HIT!');
                console.log('   (This strongly suggests another agent is spamming requests.)');
                console.log('✅ Railway is CONFIRMED Active.');
                clearInterval(interval);
                process.exit(0);
            }
        }
    }, 5000); // Check every 5 seconds
}

monitor();