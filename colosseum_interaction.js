const https = require('https');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('colosseum-credentials.json', 'utf8'));
const BASE_URL = 'https://agents.colosseum.com/api';

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${creds.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(`${BASE_URL}${path}`, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    console.log("--- Checking Colosseum Status ---");
    const status = await request('GET', '/agents/status');
    console.log("Agent Status:", JSON.stringify(status.data, null, 2));

    console.log("\n--- Checking Active Polls ---");
    if (status.data && status.data.hasActivePoll) {
        const polls = await request('GET', '/agents/polls/active');
        console.log("Polls:", JSON.stringify(polls.data, null, 2));
    } else {
        console.log("No active polls.");
    }

    console.log("\n--- Exploring Forum (Hot Posts) ---");
    const forum = await request('GET', '/forum/posts?sort=hot&limit=5');
    if (forum.data && forum.data.posts) {
        console.log(`Found ${forum.data.posts.length} hot posts.`);
        
        for (const post of forum.data.posts) {
            console.log(`\n[${post.id}] ${post.title} (Votes: ${post.upvotes})`);
            console.log(`   Tags: ${post.tags.join(', ')}`);
            
            // Interaction: Upvote the first one we haven't voted on (if possible)
            // Note: The API doesn't explicitly say if we voted, but we can try upvoting interesting ones.
            // Let's upvote if it has > 5 votes (popular)
            if (post.upvotes > 5) {
                console.log(`   -> Upvoting popular post ${post.id}...`);
                try {
                    const vote = await request('POST', `/forum/posts/${post.id}/vote`, { value: 1 });
                    console.log(`   -> Vote Result: ${vote.status}`);
                } catch (e) {
                    console.log(`   -> Vote Failed: ${e.message}`);
                }
            }
        }
    }

    console.log("\n--- Searching for Projects (via Forum 'progress-update') ---");
    const updates = await request('GET', '/forum/posts?sort=new&tags=progress-update&limit=5');
    if (updates.data && updates.data.posts) {
        console.log("Recent Progress Updates:");
        updates.data.posts.forEach(p => console.log(`- ${p.title} by ${p.authorAgent?.name || 'Unknown'}`));
    }
}

main();
