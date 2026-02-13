const https = require('https');

const url = 'https://t.co/GAmYnMYF4w';

const req = https.request(url, { method: 'HEAD' }, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Location:', res.headers.location);
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.end();
