const https = require('https');
const fs = require('fs');

const walletData = JSON.parse(fs.readFileSync('bitcoin-credentials.json', 'utf8'));

function request(method, url, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TopClaw/1.0'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verify() {
    console.log('Attempting to verify via API...');
    
    // Payload guesses
    const payloads = [
        { profile_id: walletData.auth_response.profile_id },
        { wallet_address: walletData.address },
        { profile_id: walletData.auth_response.profile_id, wallet_address: walletData.address },
        { recovery_key: walletData.recovery_key }
    ];

    for (const payload of payloads) {
        try {
            console.log('POSTing payload:', JSON.stringify(payload));
            const res = await request('POST', 'https://sellyoursouls.com/api/holders/verify', payload);
            console.log(`Status: ${res.status}`);
            console.log('Body:', typeof res.body === 'object' ? JSON.stringify(res.body, null, 2) : res.body);
            
            if (res.status === 200 || res.status === 201) {
                console.log('SUCCESS!');
                break;
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }
}

verify();