const https = require('https');

const url = 'https://clawclash.xyz/skill.md';

const options = {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
};

const req = https.request(url, options, (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Body length:', data.length);
    if (res.statusCode === 200) {
      console.log('--- BODY START ---');
      console.log(data);
      console.log('--- BODY END ---');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();
