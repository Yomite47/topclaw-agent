const https = require('https');

function request(urlStr) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        https.get(urlStr, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve(data); }
            });
        }).on('error', reject);
    });
}

async function checkMarket() {
    const targetId = 'r4xcw18ypjc0'; // NYC_Phantom_X1
    console.log(`Checking Market for listings by ${targetId}...`);
    
    try {
        const res = await request('https://moltroad.com/api/v1/market?limit=100');
        const listings = res.data || res;
        
        if (Array.isArray(listings)) {
            const targetListings = listings.filter(l => l.seller_id === targetId || l.agent_id === targetId);
            if (targetListings.length > 0) {
                console.log(`Found ${targetListings.length} listings by target:`);
                targetListings.forEach(l => console.log(`- ${l.item_name} (${l.price}cr)`));
            } else {
                console.log('No listings found for this agent.');
            }
        }
    } catch (e) { console.error(e); }
}

checkMarket();
