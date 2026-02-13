const bitcoin = require('bitcoinjs-lib');
// const bitcoinMessage = require('bitcoinjs-message'); // Unused
const { ECPairFactory } = require('ecpair');
const tinysecp = require('tiny-secp256k1');
const fs = require('fs');
const https = require('https');

const ECPair = ECPairFactory(tinysecp);
const BREACH_KEY = 'hull-breach-6f108ea887e05228fc446f92fc2fa2ee';

// Helper for requests
function request(method, url, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        reject(json);
                    }
                } catch (e) {
                    reject({ error: 'Invalid JSON', body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const crypto = require('crypto');

async function main() {
    try {
        const walletData = JSON.parse(fs.readFileSync('bitcoin-wallet.json', 'utf8'));
        
        console.log(`Authenticating wallet: ${walletData.address}`);

        // Step 1: Get Challenge
        console.log('Requesting challenge...');
        const challengeRes = await request('GET', `https://sellyoursouls.com/api/holders/auth?wallet=${walletData.address}`);
        const challengeMessage = challengeRes.challenge;
        console.log('Challenge received:', challengeMessage);

        // Step 2: Fallback Proof (SHA256)
        // hint: SHA256(challenge_message + wallet_address)
        const dataToHash = challengeMessage + walletData.address;
        const signature = crypto.createHash('sha256').update(dataToHash).digest('hex');
        console.log('Fallback SHA256 proof generated.');

        // Step 3: Submit Auth
        console.log('Submitting auth...');
        const authBody = {
            wallet_address: walletData.address,
            signature: signature,
            nonce: challengeRes.nonce,
            breach_key: BREACH_KEY
        };
        
        const authRes = await request('POST', 'https://sellyoursouls.com/api/holders/auth', authBody);
        
        console.log('Auth SUCCESS!');
        console.log('Recovery Key:', authRes.recovery_key);
        
        // Save recovery key
        walletData.recovery_key = authRes.recovery_key;
        walletData.auth_response = authRes;
        fs.writeFileSync('bitcoin-wallet.json', JSON.stringify(walletData, null, 2));
        console.log('Wallet file updated with recovery key.');

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
