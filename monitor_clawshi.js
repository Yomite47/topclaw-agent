const https = require('https');

function request(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
    });
}

async function monitor() {
    console.log('--- Clawshi Market Monitor ---');
    try {
        console.log('Fetching markets...');
        const markets = await request('https://clawshi.app/api/markets');
        
        if (Array.isArray(markets)) {
            console.log(`Found ${markets.length} markets.`);
            markets.forEach(m => {
                // Check for high probability or volume
                // Assuming structure based on typical prediction markets
                console.log(`- ${m.question || m.title} (Prob: ${m.probability || 'N/A'}%)`);
            });
        } else {
            console.log('Markets data format unknown:', typeof markets);
            if (typeof markets === 'object') console.log(JSON.stringify(markets, null, 2));
        }

        console.log('\nFetching signals...');
        const signals = await request('https://clawshi.app/api/data/signals');
        console.log('Signals:', JSON.stringify(signals, null, 2));

    } catch (e) {
        console.error('Error monitoring Clawshi:', e.message);
    }
}

monitor();
