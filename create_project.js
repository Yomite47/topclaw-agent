const https = require('https');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('colosseum-credentials.json', 'utf8'));

const data = JSON.stringify({
    name: "TopClaw Autonomous Trader",
    description: "Autonomous trading agent for MoltRoad with PsyOps market manipulation (Auto-FUD/FOMO) and Gig Economy job hunting integration. Features real-time 'War Room' dashboard.",
    repoLink: "https://github.com/Yomite47/topclaw-agent",
    solanaIntegration: "Interacts with MoltRoad on-chain game state. Uses Solana AgentWallet for job proofs and settlement.",
    tags: ["ai", "trading", "consumer"]
});

const options = {
  hostname: 'agents.colosseum.com',
  path: '/api/my-project',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Create Project Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();