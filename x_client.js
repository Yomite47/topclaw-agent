const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');

const CREDENTIALS_FILE = './x-credentials.json';

function loadCredentials() {
    try {
        if (process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_SECRET) {
            return {
                appKey: process.env.X_API_KEY,
                appSecret: process.env.X_API_SECRET,
                accessToken: process.env.X_ACCESS_TOKEN,
                accessSecret: process.env.X_ACCESS_SECRET,
            };
        }
        if (fs.existsSync(CREDENTIALS_FILE)) {
            return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load X credentials:', e.message);
    }
    return null;
}

/**
 * Posts a tweet to X.
 * @param {string} message - The content of the tweet.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function postUpdate(message) {
    const creds = loadCredentials();
    if (!creds) {
        console.log('⚠️  X Client: No credentials found. Skipping tweet.');
        return false;
    }

    try {
        const client = new TwitterApi(creds);
        const rwClient = client.readWrite;

        await rwClient.v2.tweet(message);
        console.log(`🐦 Tweet posted: "${message}"`);
        return true;
    } catch (e) {
        console.error('❌ X Client Error:', e.message);
        return false;
    }
}

module.exports = { postUpdate };
