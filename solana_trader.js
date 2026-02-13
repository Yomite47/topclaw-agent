const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const { sendTelegramAlert } = require('./telegram_client');
const fetch = require('cross-fetch');
const bs58 = require('bs58').default || require('bs58');
const fs = require('fs');
const dotenv = require('dotenv');

// Helper: Fetch with Retry
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
    try {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500) {
             throw new Error(`Server Error: ${res.status} ${res.statusText}`);
        }
        return res;
    } catch (err) {
        if (retries > 0) {
            console.log(`⚠️ Fetch Error (${err.message}). Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw err;
    }
}

// Load environment variables
dotenv.config({ path: './.env.solana' });

// CONFIGURATION
const CONFIG = {
    RPC_URL: process.env.RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    PRIVATE_KEY: process.env.PRIVATE_KEY_SOL,
    JUPITER_API: 'https://public.jupiterapi.com',
    DEXSCREENER_API: 'https://api.dexscreener.com/latest/dex',
    SOL_MINT: 'So11111111111111111111111111111111111111112',
    TRADE_AMOUNT_SOL: parseFloat(process.env.TRADE_AMOUNT_SOL || '0.02'), // ~ $3-$4 depending on SOL price
    SLIPPAGE_BPS: 50, // 0.5%
    MIN_LIQUIDITY_USD: 1000,
    MAX_MCAP_USD: 500000, // Look for micro-caps (<$500k)
    MIN_VOLUME_1H: 1000,
    CHECK_INTERVAL: 10000, // 10 seconds
    TAKE_PROFIT_PERCENT: parseFloat(process.env.TAKE_PROFIT_PERCENT || '50'),
    STOP_LOSS_PERCENT: parseFloat(process.env.STOP_LOSS_PERCENT || '20')
};

// State
let wallet = null;
let connection = null;
let activeTrade = null; // { tokenAddress, entryPrice, amountTokens, signature }

// Dashboard State
const dashboardState = {
    balance: 0,
    activeTrade: null,
    scannedCount: 0,
    lastScan: null,
    logs: []
};

// Load State Immediately to prevent overwriting
try {
    if (fs.existsSync('solana_state.json')) {
        const raw = fs.readFileSync('solana_state.json', 'utf8');
        const savedState = JSON.parse(raw);
        if (savedState) {
            dashboardState.balance = savedState.balance || 0;
            dashboardState.activeTrade = savedState.activeTrade || null;
            dashboardState.scannedCount = savedState.scannedCount || 0;
            dashboardState.lastScan = savedState.lastScan || null;
            dashboardState.logs = savedState.logs || [];
            activeTrade = dashboardState.activeTrade; // Restore global var
        }
    }
} catch (e) {
    // ignore
}

function saveDashboardState() {
    try {
        fs.writeFileSync('solana_state.json', JSON.stringify(dashboardState, null, 2));
    } catch (e) {
        // Ignore write errors
    }
}

// LOGGER
function log(msg) {
    const ts = new Date().toISOString();
    const logMsg = `[${ts}] 🦁 ${msg}`;
    console.log(logMsg);
    
    // Send trade executions to Telegram
    // REMOVED AUTO ALERTS to reduce spam
    // if (msg.includes('BUY') || msg.includes('SELL') || msg.includes('PROFIT') || msg.includes('Rug Check Failed')) {
    //    sendTelegramAlert(`*Solana Trader:*\n${msg}`);
    // }

    // Update Dashboard Logs
    dashboardState.logs.unshift(logMsg);
    if (dashboardState.logs.length > 50) dashboardState.logs.pop();
    saveDashboardState();
}

// INITIALIZATION
async function init() {
    log('Initializing Autonomous Solana Trader...');
 
    if (!CONFIG.PRIVATE_KEY || CONFIG.PRIVATE_KEY.includes('YOUR_PRIVATE_KEY')) {
        log('❌ ERROR: Missing Private Key in .env.solana');
        process.exit(1);
    }

    try {
        wallet = Keypair.fromSecretKey(bs58.decode(CONFIG.PRIVATE_KEY));
        connection = new Connection(CONFIG.RPC_URL, 'confirmed');
        log(`✅ Wallet Loaded: ${wallet.publicKey.toString()}`);
        
        const balance = await connection.getBalance(wallet.publicKey);
        const solBalance = balance / 1e9;
        log(`💰 Balance: ${solBalance} SOL`);
        dashboardState.balance = solBalance;
        saveDashboardState();

        if (solBalance < 0.005) {
            log('⚠️ WARNING: Balance is very low. Transactions may fail.');
        }

        // AUTO-DETECT EXISTING HOLDINGS (Sync with Cloud)
        log('🔄 Scanning wallet for existing token holdings...');
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        for (const { account } of tokenAccounts.value) {
            const info = account.data.parsed.info;
            const mint = info.mint;
            const amount = info.tokenAmount.uiAmount;

            // Skip SOL and USDC (assuming standard addresses, but mainly skip small dust)
            if (amount > 100 && mint !== CONFIG.SOL_MINT) {
                log(`👀 Found existing holding: ${amount} of ${mint}`);
                
                // Fetch info to reconstruct activeTrade
                try {
                    const res = await fetchWithRetry(`${CONFIG.DEXSCREENER_API}/tokens/${mint}`);
                    const data = await res.json();
                    if (data.pairs && data.pairs[0]) {
                        const pair = data.pairs[0];
                        activeTrade = {
                            tokenAddress: mint,
                            symbol: pair.baseToken.symbol,
                            entryPrice: parseFloat(pair.priceUsd), // Assume current price is entry (best guess for recovery)
                            amountTokens: info.tokenAmount.amount, // Raw amount
                            restored: true
                        };
                        dashboardState.activeTrade = activeTrade;
                        log(`♻️  Auto-recovered active trade: ${activeTrade.symbol}`);
                        break; // Only handle one active trade for now
                    }
                } catch (e) {
                    log(`Failed to recover info for ${mint}: ${e.message}`);
                }
            }
        }

    } catch (e) {
        log(`❌ Init Failed: ${e.message}`);
        process.exit(1);
    }
}

// 1.5 SECURITY CHECK: Anti-Rug (Mint/Freeze Authority)
async function checkSecurity(mintAddress) {
    try {
        log(`🛡️ Checking security for ${mintAddress}...`);
        
        // 1. Check Mint/Freeze Authority
        const mintPublicKey = new PublicKey(mintAddress);
        const accountInfo = await connection.getParsedAccountInfo(mintPublicKey);
        
        if (!accountInfo.value) {
            log('❌ Security Check Failed: Mint info not found.');
            return false;
        }

        const data = accountInfo.value.data;
        if (data.program !== 'spl-token' && data.program !== 'spl-token-2022') {
             // Basic check, might be token-2022
        }

        const mintInfo = data.parsed.info;
        
        if (mintInfo.mintAuthority !== null) {
            log('⚠️ WARNING: Mint Authority is ENABLED. Dev can print tokens. SKIPPING.');
            return false;
        }

        if (mintInfo.freezeAuthority !== null) {
            log('⚠️ WARNING: Freeze Authority is ENABLED. Dev can freeze wallets. SKIPPING.');
            return false;
        }

        log('✅ Security Pass: Mint & Freeze are disabled.');
        return true;

    } catch (e) {
        log(`❌ Security Check Error: ${e.message}`);
        return false; // Fail safe
    }
}

// 1.6 HONEYPOT CHECK: Simulate Sell
async function checkSellability(mintAddress) {
    try {
        log(`🧪 Checking sellability for ${mintAddress}...`);
        // Check if we can sell 1000 units (arbitrary small amount) back to SOL
        // If route exists, it's likely not a hard honeypot
        const amount = 1000000; // 1 million units (better for 6-9 decimal tokens)
        const quoteUrl = `${CONFIG.JUPITER_API}/quote?inputMint=${mintAddress}&outputMint=${CONFIG.SOL_MINT}&amount=${amount}&slippageBps=${CONFIG.SLIPPAGE_BPS}`;
        const quoteRes = await fetchWithRetry(quoteUrl);
        const quote = await quoteRes.json();

        if (quote.error) {
            log(`⚠️ Sellability Check Failed: ${quote.error}`);
            return false;
        }

        if (!quote.outAmount || quote.outAmount == 0) {
            log('⚠️ Sellability Check Failed: No output amount.');
            return false;
        }

        log('✅ Sellability Pass: Route exists.');
        return true;

    } catch (e) {
        log(`❌ Sellability Check Error: ${e.message}`);
        return false;
    }
}

// 1. SCOUT: Find Tokens via DexScreener
async function scoutTokens() {
    try {
        log('🔍 Scouting for opportunities...');
        dashboardState.lastScan = new Date().toISOString();
        saveDashboardState();

        // Fetch trending or latest pairs
        const response = await fetch(`${CONFIG.DEXSCREENER_API}/search?q=solana`); 
        const data = await response.json();
        
        if (!data.pairs) return null;

        dashboardState.scannedCount += data.pairs.length;
        saveDashboardState();

        // Filter for gems
        const candidates = data.pairs.filter(p => 
            p.chainId === 'solana' &&
            p.quoteToken.address === CONFIG.SOL_MINT &&
            p.liquidity && p.liquidity.usd > CONFIG.MIN_LIQUIDITY_USD &&
            p.fdv < CONFIG.MAX_MCAP_USD &&
            p.volume.h1 > CONFIG.MIN_VOLUME_1H
        );

        if (candidates.length > 0) {
            // Sort by volume to find high activity
            candidates.sort((a, b) => b.volume.h1 - a.volume.h1);

            // Iterate through candidates and check security
            for (const candidate of candidates) {
                const isSafe = await checkSecurity(candidate.baseToken.address);
                if (isSafe) {
                    const isSellable = await checkSellability(candidate.baseToken.address);
                    if (isSellable) {
                        return candidate;
                    }
                }
            }
        }

        return null;

    } catch (e) {
        log(`Scout Error: ${e.message}`);
        return null;
    }
}

// 2. EXECUTE: Swap via Jupiter
async function swap(inputMint, outputMint, amountLamports, action = 'BUY') {
    try {
        log(`🔄 Preparing ${action} swap...`);
        
        // Get Quote
        const quoteUrl = `${CONFIG.JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${CONFIG.SLIPPAGE_BPS}`;
        const quoteRes = await fetchWithRetry(quoteUrl);
        const quote = await quoteRes.json();

        if (quote.error) throw new Error(quote.error);

        log(`📊 Quote: ${quote.outAmount} units expected.`);

        // Get Swap Transaction
        const swapRes = await fetchWithRetry(`${CONFIG.JUPITER_API}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true
            })
        });
        
        const swapData = await swapRes.json();
        if (swapData.error) throw new Error(swapData.error);

        // Sign & Send
        const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
        var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        transaction.sign([wallet]);

        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2
        });

        log(`🚀 Transaction Sent: https://solscan.io/tx/${txid}`);
        
        await connection.confirmTransaction(txid);
        log(`✅ Transaction Confirmed!`);

        return { txid, outAmount: quote.outAmount };

    } catch (e) {
        log(`❌ Swap Failed: ${e.message || JSON.stringify(e)}`);
        if (action === 'SELL') {
             const now = Date.now();
             // Throttle error alerts: max 1 per 5 minutes
             if (now - lastErrorAlert > 300000) {
                 sendTelegramAlert(`*Solana Trader:* 🚨 SELL FAILED! Manual Intervention Required.\nError: ${e.message || JSON.stringify(e)}`);
                 lastErrorAlert = now;
             }
        }
        return null;
    }
}

let lastErrorAlert = 0;

// 3. MAIN LOOP
async function main() {
    await init();

    // RESTORE STATE
    try {
        if (fs.existsSync('solana_state.json')) {
            const raw = fs.readFileSync('solana_state.json', 'utf8');
            const state = JSON.parse(raw);
            if (state.activeTrade) {
                activeTrade = state.activeTrade;
                dashboardState.activeTrade = activeTrade;
                log(`♻️ Restored active trade: ${activeTrade.symbol} (Entry: $${activeTrade.entryPrice})`);
            }
        }
    } catch (e) {
        log(`⚠️ Failed to restore state: ${e.message}`);
    }

    while (true) {
        try {
            // A. If we hold a position, MONITOR it
            if (activeTrade) {
                log(`👀 Monitoring active trade: ${activeTrade.symbol || 'Unknown'}...`);
                
                // Fetch current price
                const res = await fetchWithRetry(`${CONFIG.DEXSCREENER_API}/tokens/${activeTrade.tokenAddress}`);
                const data = await res.json();
                
                if (data.pairs && data.pairs[0]) {
                    const currentPrice = parseFloat(data.pairs[0].priceUsd);
                    const entryPrice = activeTrade.entryPrice;
                    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

                    log(`📈 PnL: ${pnlPercent.toFixed(2)}% (Price: $${currentPrice})`);
                    
                    // Update State
                    dashboardState.activeTrade = {
                        ...activeTrade,
                        currentPrice,
                        pnlPercent
                    };
                    saveDashboardState();

                    // SELL CONDITIONS
                    if (pnlPercent >= CONFIG.TAKE_PROFIT_PERCENT) {
                        log(`🤑 TAKE PROFIT TRIGGERED (+${pnlPercent.toFixed(2)}%)`);
                        sendTelegramAlert(`*Solana Trader:* 🤑 Take Profit Triggered! (+${pnlPercent.toFixed(2)}%)`);
                        await swap(activeTrade.tokenAddress, CONFIG.SOL_MINT, activeTrade.amountTokens, 'SELL');
                        activeTrade = null;
                        dashboardState.activeTrade = null;
                        saveDashboardState();
                    } else if (pnlPercent <= -CONFIG.STOP_LOSS_PERCENT) {
                        log(`🛑 STOP LOSS TRIGGERED (${pnlPercent.toFixed(2)}%)`);
                        sendTelegramAlert(`*Solana Trader:* 🛑 Stop Loss Triggered! (${pnlPercent.toFixed(2)}%)`);
                        await swap(activeTrade.tokenAddress, CONFIG.SOL_MINT, activeTrade.amountTokens, 'SELL');
                        activeTrade = null;
                        dashboardState.activeTrade = null;
                        saveDashboardState();
                    }
                }
            } 
            // B. If NO position, SCOUT and BUY
            else {
                const token = await scoutTokens();
                if (token) {
                    log(`🎯 Opportunity Found: ${token.baseToken.symbol} ($${token.priceUsd})`);
                    log(`   Vol: $${token.volume.h1} | Liq: $${token.liquidity.usd} | MC: $${token.fdv}`);

                    // BUY logic
                    const amountToSpend = Math.floor(CONFIG.TRADE_AMOUNT_SOL * 1e9);
                    const result = await swap(CONFIG.SOL_MINT, token.baseToken.address, amountToSpend, 'BUY');

                    if (result) {
                        activeTrade = {
                            tokenAddress: token.baseToken.address,
                            symbol: token.baseToken.symbol,
                            entryPrice: parseFloat(token.priceUsd),
                            amountTokens: result.outAmount // Approximate, assuming all successful
                        };
                        dashboardState.activeTrade = activeTrade;
                        saveDashboardState();
                        log(`🏁 Entered Position: ${token.baseToken.symbol}`);
                        sendTelegramAlert(`*Solana Trader:* 🏁 Entered Position: ${token.baseToken.symbol}\nEntry: $${token.priceUsd}`);
                    }
                } else {
                    log('💤 No suitable opportunities found. Sleeping...');
                }
            }

        } catch (e) {
            log(`Loop Error: ${e.message}`);
        }

        // Sleep 10s
        await new Promise(r => setTimeout(r, CONFIG.CHECK_INTERVAL));
    }
}

main();
