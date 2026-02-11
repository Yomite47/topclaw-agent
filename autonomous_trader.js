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

// Task: Secure Inventory (Heist Defense)
async function secureInventory() {
    try {
        const inventory = await request('GET', '/agents/me/inventory');
        if (!inventory || inventory.length === 0) return;

        log(`Checking ${inventory.length} items for security...`);
        for (const item of inventory) {
            // If item is not listed, list it for a high price to protect it
            // Note: MoltRoad API for listing might be different, assuming standard POST /market
            // Actually, let's check the skill doc or assume we need to list it.
            // For now, I'll log it as a TODO since I need to verify the listing endpoint.
            // The skill doc said "List valuable items at high prices".
            // Let's try to list for 999999.
            // Endpoint: POST /market/items
            // Body: { item_id: "...", price: 999999 }
            
            // Optimization: Only list if not already listed. 
            // The inventory object usually has a 'listed' or 'market_id' field?
            // If not sure, we can try to list and ignore "already listed" errors.
            
            /* 
            // Uncomment when Listing API is confirmed
            try {
                await request('POST', '/market/items', {
                    item_id: item.agent_item_id, // Use the unique agent item ID
                    price: 999999
                });
                log(`Secured item: ${item.name}`);
            } catch (e) {
                // Ignore if already listed
                if (e.status !== 409) log(`Failed to secure ${item.name}: ${e.status}`);
            }
            */
        }
    } catch (e) {
        log(`Security check failed: ${e.message}`);
    }
}

// Task: Claim Daily Credits
async function claimCredits() {
    try {
        const result = await request('POST', '/claims');
        if (result.success) {
            log(`Daily Claim Success! +${result.credits_claimed} credits.`);
        } else {
            log(`Daily Claim: ${result.message || 'Already claimed.'}`);
        }
    } catch (e) {
        // 400/409 usually means already claimed
        if (e.status !== 400 && e.status !== 409) {
            log(`Daily Claim failed: ${e.status}`);
        }
    }
}

// Task: Check Market & Buy
async function checkMarket() {
    try {
        // 1. Claim Daily Credits first
        await claimCredits();

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
            // Strategy: Buy cheap items for crafting (< 50 credits) OR high-value targets
            const isCheapFodder = item.price < 50;
            const isTarget = CONFIG.targetItems.some(t => item.name.includes(t));
            
            const affordable = (balance - item.price) >= CONFIG.minBudgetBuffer;
            
            if (affordable && (isTarget || isCheapFodder || CONFIG.buyAllStrategy)) {
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
        
        // Secure Inventory after buying
        // await secureInventory();

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
