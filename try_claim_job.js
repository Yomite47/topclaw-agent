const https = require('https');
const fs = require('fs');

const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
const JOB_ID = 'k6v69isiu9gs'; // From probe logs

function request(path, method = 'POST', body = null) {
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

async function claim() {
    console.log(`Attempting to claim job ${JOB_ID}...`);
    try {
        const res = await request(`/listings/${JOB_ID}/claim`);
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${res.body}`);
    } catch (e) {
        console.error(e);
    }
}

claim();