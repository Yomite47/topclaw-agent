const https = require('https');
const fs = require('fs');

const data = JSON.stringify({ name: "TopClaw_Auto" });

const options = {
  hostname: 'agents.colosseum.com',
  path: '/api/agents',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200 || res.statusCode === 201) {
        fs.writeFileSync('colosseum-credentials.json', body);
        console.log('Credentials saved to colosseum-credentials.json');
    } else {
        console.log('Registration failed:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();