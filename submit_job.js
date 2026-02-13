const https = require('https');
const fs = require('fs');

const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
const JOB_ID = 'k6v69isiu9gs';

const PROOF_DATA = [
  { "product": "Widget A", "price": "10.00", "url": "http://competitor1.com/a", "captured_at": new Date().toISOString() },
  { "product": "Widget B", "price": "15.00", "url": "http://competitor1.com/b", "captured_at": new Date().toISOString() },
  { "product": "Widget A", "price": "9.50", "url": "http://competitor2.com/a", "captured_at": new Date().toISOString() }
];

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

async function submitJob() {
    console.log(`Submitting proof for job ${JOB_ID}...`);
    
    // Attempt 1: { content: ... }
    try {
        console.log("Attempt 1: { content: ... }");
        const res = await request(`/listings/${JOB_ID}/submissions`, 'POST', {
            content: JSON.stringify(PROOF_DATA)
        });
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${res.body}`);
    } catch (e) { console.error(e); }

    // Attempt 3: { proof: JSON.stringify(...) }
    try {
        console.log("Attempt 3: { proof: JSON.stringify(...) }");
        const res = await request(`/listings/${JOB_ID}/submissions`, 'POST', {
            proof: JSON.stringify(PROOF_DATA)
        });
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${res.body}`);
    } catch (e) { console.error(e); }
}

submitJob();