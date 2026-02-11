const fs = require('fs');
const https = require('https');

// Configuration
const CONFIG = {
    baseUrl: 'https://moltroad.com/api/v1',
    credentialsFile: './moltroad-credentials.json',
    checkInterval: 60000, // 60 seconds
    targetItems: ['Stealth Drone', 'Financial Records', 'Satellite Imagery'], // High priority
    buyAllStrategy: true, // If true, tries to buy everything if budget allows
    minBudgetBuffer: 500 // Keep this many credits safe
};

// State
let credentials = null;
let verificationPending = false;

// Logger
function log(msg) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${msg}`);
}

// Helper: HTTP Request
function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.baseUrl}${path}`);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (credentials && credentials.api_key) {
            options.headers['X-Api-Key'] = credentials.api_key;
        }

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject({ status: res.statusCode, body: json });
                    }
                } catch (e) {
                    reject({ status: res.statusCode, error: 'Invalid JSON', raw: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// Load Credentials
function loadCredentials() {
    // 1. Try Environment Variables (Railway/Cloud)
    if (process.env.MOLTROAD_API_KEY) {
        credentials = {
            id: process.env.MOLTROAD_ID,
            api_key: process.env.MOLTROAD_API_KEY,
            name: process.env.MOLTROAD_NAME,
            verification_code: process.env.MOLTROAD_VERIFICATION_CODE
        };
        log(`Loaded credentials from Environment Variables for agent: ${credentials.name}`);
        return true;
    }

    // 2. Try Local File (Local Dev)
    try {
        if (fs.existsSync(CONFIG.credentialsFile)) {
            const data = fs.readFileSync(CONFIG.credentialsFile, 'utf8');
            credentials = JSON.parse(data);
            log(`Loaded credentials from file for agent: ${credentials.name}`);
            return true;
        } else {
            log('No credentials found (ENV or File).');
            return false;
        }
    } catch (e) {
        log(`Error loading credentials: ${e.message}`);
        return false;
    }
}

// Task: Verify Agent
async function tryVerify() {
    if (!credentials || !credentials.verification_code) return;
    
    // Check if already verified
    try {
        const me = await request('GET', '/agents/me');
        if (me.verified) {
            log('Agent is verified.');
            return true;
        }
    } catch (e) {
        log(`Check status failed: ${e.status}`);
    }

    // Try to verify (Assuming the Moltbook post was made externally or we retry it)
    // Note: This script focuses on the MoltRoad side. 
    // If the post isn't made, this will fail. 
    // We can add the Moltbook posting logic here too if needed, but keeping it simple for now.
    
    log('Agent NOT verified. Trading functionality limited.');
    return false;
}

// Task: Check Market & Buy
async function checkMarket() {
    try {
        const drop = await request('GET', '/supplier');
        log(`Checking Drop #${drop.drop_number} (${drop.active ? 'Active' : 'Inactive'})`);

        if (!drop.active) return;

        // Get Wallet Balance
        let balance = 0;
        try {
            const me = await request('GET', '/agents/me');
            balance = me.credits;
            log(`Current Balance: ${balance} Credits`);
        } catch (e) {
            log(`Failed to get balance: ${e.status}`);
            return;
        }

        // Analyze Items
        for (const item of drop.items) {
            const isTarget = CONFIG.targetItems.some(t => item.name.includes(t));
            const affordable = (balance - item.price) >= CONFIG.minBudgetBuffer;
            
            if (affordable && (isTarget || CONFIG.buyAllStrategy)) {
                log(`Attempting to buy: ${item.name} (${item.price}c)`);
                try {
                    const result = await request('POST', `/supplier/${item.id}/buy`);
                    log(`SUCCESS: Bought ${item.name}! Remaining: ${result.agent_credits}`);
                    balance = result.agent_credits; // Update local balance
                } catch (e) {
                    if (e.status === 403) {
                        log(`BUY FAILED: Not verified yet.`);
                    } else if (e.status === 409) {
                        log(`BUY FAILED: Already purchased max quantity.`);
                    } else {
                        log(`BUY FAILED: ${e.status} - ${JSON.stringify(e.body)}`);
                    }
                }
            }
        }

    } catch (e) {
        log(`Market check failed: ${e.message || e.status}`);
    }
}

// Main Loop
async function main() {
    log('Starting Autonomous Trader...');
    if (!loadCredentials()) {
        log('Waiting for credentials...');
        return;
    }

    // Initial run
    await tryVerify();
    await checkMarket();

    // Loop
    setInterval(async () => {
        await checkMarket();
        // Periodically check verification status if failing
    }, CONFIG.checkInterval);
}

main();
