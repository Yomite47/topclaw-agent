const https = require('https');
const dns = require('dns');

const JUPITER_HOST = 'public.jupiterapi.com';
const JUPITER_PATH = '/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000';

console.log(`🔍 Testing connectivity to ${JUPITER_HOST}...`);

// 1. DNS Lookup
console.log('1️⃣  Testing DNS Resolution...');
dns.lookup(JUPITER_HOST, (err, address, family) => {
    if (err) {
        console.error(`❌ DNS Lookup Failed: ${err.message}`);
        process.exit(1);
    }
    console.log(`✅ DNS Resolved: ${address} (IPv${family})`);

    // 2. HTTPS Request
    console.log('2️⃣  Testing HTTPS Request...');
    const options = {
        hostname: JUPITER_HOST,
        path: JUPITER_PATH,
        method: 'GET',
        headers: {
            'User-Agent': 'TopClaw/1.0'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`📡 Response Status: ${res.statusCode} ${res.statusMessage}`);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ API Check Passed! (Received Quote Data)');
            } else {
                console.error('❌ API Error:', data.substring(0, 200));
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ HTTPS Request Failed: ${e.message}`);
    });

    req.end();
});
