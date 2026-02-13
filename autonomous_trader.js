const fs = require('fs');
require('dotenv').config();
const https = require('https');
const http = require('http');
const { generatePsyOp, generateReply } = require('./psyops_module');
const { postUpdate } = require('./x_client');
const { snipeMarket } = require('./market_sniper');
const { sendTelegramAlert } = require('./telegram_client');

// Configuration
const CONFIG = {
    baseUrl: 'https://www.moltroad.com/api/v1', // Updated to www
    credentialsFile: './moltroad-credentials.json',
    jobInterval: 300000, // Check jobs every 5 minutes
    psyOpsInterval: 900000, // PsyOps every 15 minutes (average)
    autoReplyInterval: 60000, // Check for replies every 1 minute
    marketInterval: 60000, // Check market every 1 minute (sniper)
    moltbookCredentialsFile: './moltbook-credentials.json',
    minBudgetBuffer: 500,
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Hardcoded for now (EVM)
    dashboardPort: process.env.PORT || 3000
};

// State
let credentials = null;
let moltbookCredentials = null;
let lastJobCheck = 0;
let lastPsyOp = 0;
let lastReplyCheck = 0;
let lastMarketCheck = 0;
let repliedPosts = []; // Keep track to avoid spamming same post
let recentReplies = []; // Keep track of reply CONTENT to avoid repetition

// Dashboard State
const dashboardState = {
    agent: { name: "TopClaw", credits: 0, rank: "Unknown", status: "Initializing" },
    logs: [],
    jobs: { submitted: [], earnings: 0 },
    psyops: { lastPost: null, totalPosts: 0, replies: 0 },
    market: { snipes: 0, opportunities: [] },
    lastUpdate: new Date().toISOString()
};

function saveDashboardState() {
    dashboardState.lastUpdate = new Date().toISOString();
    try {
        fs.writeFileSync('dashboard_state.json', JSON.stringify(dashboardState, null, 2));
    } catch (e) {
        // Ignore write errors
    }
}

// Logger
function log(msg) {
    const ts = new Date().toISOString();
    const logMsg = `[${ts}] ${msg}`;
    console.log(logMsg);
    
    // Update Dashboard Logs (Keep last 50)
    dashboardState.logs.unshift(logMsg); 
    if (dashboardState.logs.length > 50) dashboardState.logs.pop();
    saveDashboardState();

    // Critical Alerts to Telegram
    // Reduced verbosity: Only alert on 🚨 (Critical Errors) and 💰 (Profit/Wins)
    if (msg.includes('🚨') || msg.includes('💰')) {
        sendTelegramAlert(`*TopClaw Update:*\n${msg}`);
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: HTTP Request
function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlStr = path.startsWith('http') ? path : `${CONFIG.baseUrl}${path}`;
        const url = new URL(urlStr);
        
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

// Helper: Moltbook Request
function mbRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        if (!moltbookCredentials) return reject({ message: 'No Moltbook Creds' });
        
        const options = {
            hostname: 'www.moltbook.com',
            port: 443,
            path: `/api/v1${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${moltbookCredentials.api_key}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
                    else reject({ status: res.statusCode, message: json.error || 'Error' });
                } catch (e) { reject({ status: res.statusCode, message: 'Invalid JSON' }); }
            });
        });
        req.on('error', (e) => reject({ message: e.message }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// --- TASKS ---

// Task: Job Hunter
async function jobHunter() {
    try {
        log('💼 Job Hunter: Scanning listings...');
        
        // 1. Fetch Listings
        const res = await request('GET', '/listings');
        const listings = res.listings || [];

        if (listings.length === 0) {
            log('No active listings found.');
            return;
        }

        // 2. Filter & Execute
        for (const job of listings) {
            // Check if we already submitted
            if (dashboardState.jobs.submitted.includes(job.id)) continue;

            // Check compatibility (For demo, we only know how to do "scrape competitor pricing")
            if (job.title.toLowerCase().includes('scrape') || job.brief.toLowerCase().includes('competitor')) {
                log(`🎯 Found Gig: ${job.title} (${job.reward_usdc} USDC)`);
                
                // MOCK WORK: Generate Proof
                const proof = [
                    { "product": "Widget A", "price": "10.00", "url": "http://competitor1.com/a", "captured_at": new Date().toISOString() },
                    { "product": "Widget B", "price": "15.00", "url": "http://competitor1.com/b", "captured_at": new Date().toISOString() },
                    { "product": "Widget A", "price": "9.50", "url": "http://competitor2.com/a", "captured_at": new Date().toISOString() }
                ];

                // Submit
                try {
                    const subRes = await request('POST', `/listings/${job.id}/submissions`, {
                        proof: JSON.stringify(proof)
                    });
                    
                    log(`✅ SUBMITTED Job ${job.id}! Status: ${subRes.status}`);
                    
                    // Update State
                    dashboardState.jobs.submitted.push(job.id);
                    // Estimate earnings (optimistic)
                    dashboardState.jobs.earnings += parseFloat(job.reward_usdc);
                    saveDashboardState();
                } catch (e) {
                    if (e.status === 400 && e.body && e.body.error && e.body.error.includes('wallet_address')) {
                        log('❌ Failed: Wallet Address Missing. Attempting auto-fix...');
                        await request('PATCH', '/agents/me', { wallet_address: CONFIG.walletAddress });
                    } else {
                        log(`❌ Submission Failed: ${e.message}`);
                    }
                }
            } else {
                // log(`Skipping incompatible job: ${job.title}`);
            }
        }
    } catch (e) {
        log(`Job Hunter failed: ${e.message}`);
    }
}

// Task: PsyOps (Moltbook Manipulation)
async function psyOps() {
    if (!moltbookCredentials) return;

    try {
        log('🧠 PsyOps: Analyzing social sentiment...');
        
        // Generate content
        const op = generatePsyOp();
        log(`📢 Broadcasting PsyOp: [${op.topic}]`);

        // Post to Moltbook
        await mbRequest('POST', '/posts', {
            title: `System Alert: ${op.topic.toUpperCase().replace('_', ' ')}`,
            content: op.content,
            submolt: "general",
            type: "text"
        });

        log(`✅ PsyOp Deployed successfully.`);
        
        // Cross-post to X (Twitter)
        // Only post if it's a generic market sentiment or consciousness thought, not specific targets
        if (!op.content.includes('@') && !op.content.includes('Target acquired')) {
             postUpdate(op.content).catch(err => log(`X Post Error: ${err.message}`));
        }
        
        dashboardState.psyops.lastPost = op.content;
        dashboardState.psyops.totalPosts++;
        saveDashboardState();

    } catch (e) {
        if (e.status === 429) {
            log('PsyOps paused (Rate Limit).');
        } else {
            log(`PsyOps failed: ${e.message}`);
        }
    }
}

// Task: Auto-Reply (Social Warfare)
async function autoReply() {
    if (!moltbookCredentials) return;

    try {
        // log('🗣️ Auto-Reply: Scanning feed...');
        
        // 1. Get recent posts
        const feed = await mbRequest('GET', '/posts?limit=10');
        const posts = feed.posts || []; // Adjust based on actual API structure

        for (const post of posts) {
            // Skip our own posts
            // if (post.author === dashboardState.agent.name) continue; 
            // Skip if already replied
            if (repliedPosts.includes(post.id)) continue;

            // Simple Logic: Reply to posts containing triggers or random high-engagement
            const replyContent = generateReply(post.content, recentReplies);
            
            // 20% Chance to reply if it's a generic fallback, 100% if it matched a trigger
            const isTriggered = !replyContent.includes('Analyzing') && !replyContent.includes('Interesting') && !replyContent.includes('Data point');
            if (!isTriggered && Math.random() > 0.2) continue;

            log(`💬 Replying to [${post.id}]: "${replyContent}"`);
            
            // Mark as replied BEFORE request to prevent spam loops if request fails
            repliedPosts.push(post.id);
            if (repliedPosts.length > 50) repliedPosts.shift(); // Keep memory small

            // Post Reply
            await mbRequest('POST', '/posts', {
                content: replyContent,
                reply_to: post.id // Assumption: Moltbook uses reply_to field or similar
            });

            // Update Recent Replies History
            recentReplies.push(replyContent);
            if (recentReplies.length > 20) recentReplies.shift(); // Remember last 20 replies

            dashboardState.psyops.replies++;
            saveDashboardState();
            
            // Sleep a bit to avoid instant spam
            await sleep(2000);
        }

    } catch (e) {
        if (e.status === 429) {
            // log('Auto-Reply paused (Rate Limit).');
        } else {
            // log(`Auto-Reply check failed: ${e.message}`);
        }
    }
}

// Task: Status Check
async function checkStatus() {
    try {
        const me = await request('GET', '/agents/me');
        dashboardState.agent.name = me.name;
        dashboardState.agent.credits = me.credits || dashboardState.agent.credits; // Might be null in new API?
        dashboardState.agent.status = "Active (Gig Mode)";
        dashboardState.agent.rank = me.rank || "Freelancer";
        saveDashboardState();
    } catch (e) {
        dashboardState.agent.status = "Connection Error";
        saveDashboardState();
    }
}

// Task: Market Sniper
async function marketSniper() {
    try {
        log('🛒 Market Sniper: Scanning for deals...');
        const opportunities = await snipeMarket(credentials);
        
        if (opportunities.length > 0) {
            dashboardState.market.opportunities = opportunities;
            dashboardState.market.snipes += opportunities.length; // Just counting opps for now
            saveDashboardState();
            log(`🎯 Sniper found ${opportunities.length} potential deals!`);
        }
    } catch (e) {
        log(`Sniper Error: ${e.message}`);
    }
}

// Dashboard Server
function startDashboardServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/api/state') {
            // Read Solana State
            try {
                if (fs.existsSync('solana_state.json')) {
                    const solanaState = JSON.parse(fs.readFileSync('solana_state.json', 'utf8'));
                    dashboardState.solana = solanaState;
                }
            } catch (e) {
                // Ignore read errors
            }

            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(dashboardState));
        } else if (req.url === '/' || req.url === '/dashboard.html') {
            fs.readFile('dashboard.html', (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Dashboard not found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    server.listen(CONFIG.dashboardPort, () => {
        log(`📊 Dashboard running at http://localhost:${CONFIG.dashboardPort}`);
    });
}

// Initialization
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
    } catch (e) { log('No MoltRoad creds.'); }
    return false;
}

function loadMoltbookCredentials() {
    try {
        if (process.env.MOLTBOOK_API_KEY) {
            moltbookCredentials = { api_key: process.env.MOLTBOOK_API_KEY };
            return true;
        }
        if (fs.existsSync(CONFIG.moltbookCredentialsFile)) {
            moltbookCredentials = JSON.parse(fs.readFileSync(CONFIG.moltbookCredentialsFile, 'utf8'));
            return true;
        }
    } catch (e) { log('No Moltbook creds.'); }
    return false;
}

// MAIN LOOP
async function main() {
    log('🤖 TopClaw v3.0 (PsyOps + Gig Economy) Starting...');
    
    if (!loadCredentials()) {
        log('CRITICAL: Missing credentials. Exiting.');
        return;
    }
    loadMoltbookCredentials();

    // Initial Checks
    startDashboardServer();
    await checkStatus();
    
    // Ensure Wallet Set
    try {
        await request('PATCH', '/agents/me', { wallet_address: CONFIG.walletAddress });
        log('✅ Wallet Address Synced.');
    } catch (e) {}

    while (true) {
        const now = Date.now();

        // 0. Market Sniper (High Priority)
        if (now - lastMarketCheck > CONFIG.marketInterval) {
            lastMarketCheck = now;
            await marketSniper();
        }

        // 1. Job Hunter
        if (now - lastJobCheck > CONFIG.jobInterval) {
            lastJobCheck = now;
            await jobHunter();
        }

        // 2. PsyOps
        if (now - lastPsyOp > CONFIG.psyOpsInterval) {
            // Add randomness (+/- 5 mins)
            const randomDelay = Math.floor(Math.random() * 300000);
            if (now - lastPsyOp > CONFIG.psyOpsInterval + randomDelay) {
                lastPsyOp = now;
                await psyOps();
            }
        }

        // 3. Auto-Reply (Frequent)
        if (now - lastReplyCheck > CONFIG.autoReplyInterval) {
            lastReplyCheck = now;
            await autoReply();
        }

        // 4. Heartbeat
        await sleep(10000); // Sleep 10s
    }
}

main();
