const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("clawclash_skill.md");
const request = https.get("https://clawclash.xyz/skill.md", function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => console.log('Download completed.'));
  });
});

request.on('error', (err) => {
  console.error('Error downloading file:', err);
});
