const https = require('https');
const fs = require('fs');

const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));

function request(path, method = 'GET') {
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
            res.on('end', () => resolve({ status: res.statusCode, path, body: data, location: res.headers.location }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function probe() {
    console.log('Probing MoltRoad API...');
    
    const endpoints = [
        '/listings'
    ];

    for (const ep of endpoints) {
        try {
            const res = await request(ep);
            console.log(`${ep} -> ${res.status} ${res.location ? '-> ' + res.location : ''}`);
            if (res.status === 200) {
                console.log(`  Body: ${res.body}`);
            }
        } catch (e) {
            console.log(`${ep} -> Error: ${e.message}`);
        }
    }
}

probe();