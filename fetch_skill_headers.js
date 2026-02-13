const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'clawclash.xyz',
  port: 443,
  path: '/skill.md',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

const file = fs.createWriteStream("clawclash_skill.md");

const req = https.request(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${res.statusCode}`);
    res.resume();
    return;
  }
  
  res.pipe(file);
  file.on('finish', () => {
    file.close(() => console.log('Download completed.'));
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
