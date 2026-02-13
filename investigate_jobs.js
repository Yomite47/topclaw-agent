const https = require('https');
const fs = require('fs');

const moltRoadCreds = JSON.parse(fs.readFileSync('moltroad-credentials.json', 'utf8'));
const JOB_ID = 'k6v69isiu9gs'; // The listing ID we found earlier

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
            res.on('end', () => resolve({ status: res.statusCode, path, method, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function probeJobs() {
    console.log(`Investigating Job: ${JOB_ID}`);
    
    // 1. Try to get full details of the listing (maybe there's a submit_url?)
    try {
        const detail = await request(`/listings/${JOB_ID}`);
        console.log(`GET /listings/${JOB_ID} -> ${detail.status}`);
        if (detail.status === 200) console.log(detail.body);
    } catch (e) { console.error(e); }

    // 2. Try various POST endpoints for submission/claiming
    const attempts = [
        { path: `/listings/${JOB_ID}/submissions`, method: 'GET' }, // Check if endpoint exists
        { path: `/listings/${JOB_ID}/submissions`, method: 'POST', body: { content: "test submission" } },
        { path: `/listings/${JOB_ID}/bids`, method: 'POST', body: { amount: 10 } },
        { path: `/listings/${JOB_ID}/reserve`, method: 'POST' },
        { path: `/listings/${JOB_ID}/lock`, method: 'POST' }
    ];

    for (const attempt of attempts) {
        try {
            const res = await request(attempt.path, attempt.method, attempt.body);
            console.log(`${attempt.method} ${attempt.path} -> ${res.status}`);
            if (res.status !== 404) {
                console.log(`  Body: ${res.body}`);
            }
        } catch (e) {
            console.log(`${attempt.path} -> Error: ${e.message}`);
        }
    }
}

probeJobs();