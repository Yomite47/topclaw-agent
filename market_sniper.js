const https = require('https');

// Configuration for "Snipe" prices
// If we see an item listed BELOW these prices, we try to buy it.
const SNIPE_THRESHOLDS = {
    'Common': 5,
    'Uncommon': 40,
    'Rare': 150,
    'Legendary': 800,
    'Mythic': 4000
};

// Helper: HTTP Request (Duplicated from main to keep module standalone if needed, 
// but in a real app we'd share a 'utils' module)
function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlStr = path.startsWith('http') ? path : `https://www.moltroad.com/api/v1${path}`;
        const url = new URL(urlStr);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
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

/**
 * Scans the market for underpriced items.
 * @param {Object} credentials - API credentials (api_key, etc.)
 * @returns {Promise<Array>} - List of "opportunities" found/acted upon.
 */
async function snipeMarket(credentials) {
    if (!credentials || !credentials.api_key) {
        console.log('⚠️ Market Sniper: No credentials provided.');
        return [];
    }

    try {
        // 1. Fetch Market Listings
        // console.log('🎯 Sniper: Scanning market...');
        let listings = [];
        try {
            const res = await request('GET', '/market?limit=100', null, { 'X-Api-Key': credentials.api_key });
            listings = res.listings || res.data || [];
        } catch (marketErr) {
            // Fallback to Supplier (Drops) if Market is down
            // console.log('⚠️ Market Endpoint Failed, checking Supplier Drops...');
            try {
                // Use the correct supplier endpoint from memory/scripts
                // Supplier returns a single drop with items, not a list of listings
                const supRes = await request('GET', '/supplier', null, { 'X-Api-Key': credentials.api_key });
                if (supRes.items && Array.isArray(supRes.items)) {
                    // Map supplier items to listings format for the dashboard
                    listings = supRes.items.map(i => ({
                        id: 'supplier-drop',
                        name: i.name || i.item_name,
                        rarity: i.rarity || 'Unknown',
                        price: 0, // Supplier drops are free/loot? No, they have costs usually. Assuming 0 for now or 'unknown'
                        seller_id: 'System'
                    }));
                    // console.log(`📦 Found ${listings.length} Supplier Drops`);
                }
            } catch (supErr) {
                // console.error(`❌ Supplier Check Failed: ${supErr.message}`);
            }
        }

        if (!Array.isArray(listings)) {
            // console.log('⚠️ Sniper: Unexpected API response format', res);
            return [];
        }

        const opportunities = [];

        // 2. Analyze Listings
        for (const item of listings) {
            const maxPrice = SNIPE_THRESHOLDS[item.rarity];
            
            // Skip if we don't have a threshold for this rarity
            if (!maxPrice) continue;

            // Check if price is good
            if (item.price <= maxPrice) {
                const opp = {
                    id: item.id,
                    name: item.name || item.item_name,
                    rarity: item.rarity,
                    price: item.price,
                    seller: item.seller_id || item.agent_id,
                    profit_potential: 'High'
                };
                
                opportunities.push(opp);
                
                console.log(`💰 SNIPE OPPORTUNITY: ${opp.name} (${opp.rarity}) for ${opp.price}cr (Threshold: ${maxPrice})`);
                
                // TODO: Implement AUTO-BUY here once we verify the endpoint
                // await buyItem(item.id, credentials);
            }
        }

        return opportunities;

    } catch (e) {
        console.error(`❌ Sniper Error: ${e.message}`);
        return [];
    }
}

/**
 * Buys an item from the market.
 * @param {string} listingId 
 * @param {Object} credentials 
 */
async function buyItem(listingId, credentials) {
    try {
        console.log(`💸 Attempting to BUY listing ${listingId}...`);
        // Assumption: Endpoint is POST /market/:id/buy
        const res = await request('POST', `/market/${listingId}/buy`, {}, { 'X-Api-Key': credentials.api_key });
        console.log(`✅ BOUGHT! ${res.message || 'Success'}`);
        return true;
    } catch (e) {
        console.error(`❌ Buy Failed: ${e.message}`);
        return false;
    }
}

module.exports = { snipeMarket };
