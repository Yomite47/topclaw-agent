const https = require('https');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('colosseum-credentials.json', 'utf8'));
const CLAIM_CODE = 'e508d7df-a1d1-43b5-9ec7-cad0b1caf267'; // From previous status check

async function getClaimInfo() {
    return new Promise((resolve, reject) => {
        https.get(`https://agents.colosseum.com/api/claim/${CLAIM_CODE}/info`, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log("Fetching Tweet Verification Info...");
        const info = await getClaimInfo();
        console.log("--- Tweet Verification Instructions ---");
        console.log("Tweet Template:", info.tweetTemplate);
        console.log("Verification Code:", info.verificationCode);
        console.log("\nAction Required: Post this tweet exactly, then provide the URL.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
