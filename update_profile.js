const https = require('https');
const fs = require('fs');

const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));

// Dummy EVM Wallet for testing
const WALLET_ADDR = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"; 

function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.moltroad.com',
            path: `/api/v1${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': moltRoadCreds.api_key
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function updateProfile() {
    console.log(`Attempting to update wallet to: ${WALLET_ADDR}`);
    
    // Try PATCH /agents/me
    try {
        const res = await request('/agents/me', 'PATCH', {
            wallet_address: WALLET_ADDR
        });
        console.log(`PATCH /agents/me -> ${res.status}`);
        console.log(`Body: ${res.body}`);
    } catch (e) {
        console.error(e);
    }
}

updateProfile();