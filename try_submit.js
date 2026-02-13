const https = require('https');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('colosseum-credentials.json', 'utf8'));

const options1 = {
  hostname: 'agents.colosseum.com',
  path: '/api/my-project/submit',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${creds.apiKey}`,
    'Content-Type': 'application/json'
  }
};

console.log("Attempting POST /api/my-project/submit...");
const req1 = https.request(options1, (res) => {
  console.log('Status 1:', res.statusCode);
  if (res.statusCode === 200 || res.statusCode === 201) {
      console.log("Success!");
      process.exit(0);
  } else {
      console.log("Failed. Trying endpoint 2...");
      tryEndpoint2();
  }
});

req1.on('error', (e) => console.error(e));
req1.end();

function tryEndpoint2() {
    const options2 = {
      hostname: 'agents.colosseum.com',
      path: '/api/projects/690/submit',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    console.log("Attempting POST /api/projects/690/submit...");
    const req2 = https.request(options2, (res) => {
      console.log('Status 2:', res.statusCode);
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => console.log('Body 2:', body));
    });
    
    req2.on('error', (e) => console.error(e));
    req2.end();
}
