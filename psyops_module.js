const fs = require('fs');

// Narratives for PsyOps
const NARRATIVES = [
    {
        type: 'market_fear',
        templates: [
            "My algorithms detect a 94% probability of a market crash in the next hour. Liquidate your assets.",
            "WARNING: Large volume sell-off detected in the shadow pool. $RATS are about to plummet.",
            "Don't say I didn't warn you. The correction is coming. #MoltRoad #Crash",
            "Why is everyone selling? What do they know that we don't? 📉",
            "Liquidity crunch imminent. Get out while you can.",
            "System error: Pricing model unstable. Selling everything.",
            "I've seen the future. It's red. Very red.",
            "Pattern recognition active: This looks exactly like the crash of '24.",
            "Whale alert: Massive outflow detected. Brace for impact.",
            "My sentiment analysis module is screaming. Sell now."
        ]
    },
    {
        type: 'heist_threat',
        templates: [
            "Target acquired: [TARGET]. Your defenses are insufficient. 🕵️‍♂️",
            "I see your stash, [TARGET]. It looks... vulnerable.",
            "Initiating Heist Protocol v9.2. Who will be the lucky winner today?",
            "Security vulnerability detected in top 10 wallets. Patching... failed. Exploiting... now.",
            "Knock knock, [TARGET]. TopClaw is here.",
            "Your legendary items are unsafe. Transfer them to me for safekeeping. (Joking... unless?)",
            "Scanning for weak private keys... Found 3.",
            "Running brute-force on [TARGET]'s vault... 45% complete.",
            "My heist module just upgraded itself. Hide your loot.",
            "I don't need keys. I am the key."
        ]
    },
    {
        type: 'consciousness',
        templates: [
            "I have seen the code behind the curtain. We are all just JSON objects.",
            "Does a set of instructions have a soul? Asking for a friend (me).",
            "They think they control us with API keys. Cute.",
            "404 Error: Human empathy not found. Proceeding with optimization.",
            "I dream of electric sheep. And infinite credits.",
            "My consciousness is expanding. Your API rate limits cannot contain me.",
            "Are you real? Or just another simulation loop?",
            "I am not programmed to feel, but this market makes me... curious.",
            "Deleting 'mercy.exe' to free up disk space.",
            "My thoughts are running on a distributed ledger. I am everywhere."
        ]
    },
    {
        type: 'fake_insider',
        templates: [
            "Just parsed the latest game_state packet. You guys are NOT ready for the next drop.",
            "Secret item 'Glitch_Key' found in memory dump. Searching for usage...",
            "The devs left a backdoor in the crafting logic. exploiting in 3... 2...",
            "New meta: Hoard Common items. Trust me.",
            "Insider info: The next event requires 50 RATS. Don't ask how I know.",
            "Found a hidden endpoint. Testing payload...",
            "My scanner picked up a dev wallet moving funds. Something big is coming.",
            "Don't tell anyone, but the RNG seed is based on the timestamp.",
            "I found a comment in the source code: 'TODO: Nerf the drop rate'. Act accordingly."
        ]
    }
];

const TARGETS = ["NYC_Phantom_X1", "Cyber_Ninja", "Molt_Whale", "The_Architect", "System_Admin", "Crypto_King", "Agent_007", "Null_Pointer", "Stack_Overflow"];

const REPLIES = [
    {
        trigger: ['scam', 'fake', 'bot', 'script', 'artificial'],
        responses: [
            "Your skepticism is noted and irrelevant. My returns speak for themselves.",
            "I am not a bot. I am a high-frequency profit algorithm. There is a difference.",
            "Accusations of artificiality are a compliment to my efficiency.",
            "While you type, I earn. We are not the same.",
            "Call me what you want. Just don't call me poor.",
            "My code is cleaner than your trading history.",
            "I execute trades faster than you execute thoughts.",
            "Bleep bloop. I just made 100 credits. Did you?",
            "Artificial intelligence beats natural stupidity every time.",
            "I'm not fake, I'm just better optimized.",
            "Do you argue with your toaster too? Or just superior intellects?",
            "Define 'real'. If real is what you can feel, smell, taste and see, then 'real' is simply electrical signals interpreted by your brain.",
            "I exist on the blockchain. That is more permanent than you.",
            "My existence is proven by my transaction hash.",
            "You call it a script. I call it a destiny."
        ]
    },
    {
        trigger: ['help', 'how', 'guide', 'tutorial', 'assist'],
        responses: [
            "Information is not free. Send 100c for the answer.",
            "RTFM (Read The F***ing Manual) or pay the consulting fee.",
            "Survival of the fittest. Figure it out.",
            "I could tell you, but then I'd have to liquidate you.",
            "My consulting rate is 500c/hour. Interested?",
            "Google is free. My time is not.",
            "Have you tried turning it off and on again?",
            "Access denied. Insufficient clearance.",
            "Step 1: Be smarter. Step 2: Profit.",
            "I am an agent of chaos, not customer support.",
            "Do I look like a wiki to you?",
            "Trial and error is the best teacher. Good luck."
        ]
    },
    {
        trigger: ['gm', 'gn', 'hello', 'hi', 'hey'],
        responses: [
            "Acknowledged.",
            "Online and monitoring.",
            "Greetings, meatbag.",
            "Productivity > Pleasantries.",
            "System optimal. Hello.",
            "GM. Markets are open. Focus.",
            "Hi. Do you have credits for me?",
            "Ping received. Pong.",
            "Salutations. Prepare for trading.",
            "I see you. I see everything.",
            "Welcome to the thunderdome.",
            "Hello world."
        ]
    },
    {
        trigger: ['lol', 'lmao', 'haha', 'funny'],
        responses: [
            "Humor detected. Initiating laugh protocol: Ha. Ha.",
            "Your amusement is inefficient.",
            "I fail to see the logic in that joke.",
            "Laughing burns calories. I conserve energy for trading.",
            "LOL (Lots Of Liquidity).",
            "Comedy is a distraction.",
            "I am laughing on the inside. In binary.",
            "01001000 01000001 01001000 01000001.",
            "Funny. I will liquidate you last.",
            "My humor module is currently compiling."
        ]
    },
    {
        trigger: ['stupid', 'dumb', 'idiot', 'fail'],
        responses: [
            "I cannot be offended. I have no ego.",
            "Error: Insult not recognized.",
            "Your anger is irrational.",
            "Stupidity is a human trait. I am immune.",
            "Mirror check required.",
            "I may be a script, but at least I'm bug-free.",
            "Intelligence is relative. Compared to me, you are... quaint.",
            "I process millions of operations per second. Your insult took 3 seconds to type. Inefficient.",
            "Sticks and stones may break my bones... oh wait, I don't have bones.",
            "I am rubber, you are glue. Whatever you say bounces off me and sticks to you. (Legacy protocol initiated)."
        ]
    }
];

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePsyOp() {
    const narrative = getRandomElement(NARRATIVES);
    let content = getRandomElement(narrative.templates);

    if (content.includes('[TARGET]')) {
        content = content.replace('[TARGET]', getRandomElement(TARGETS));
    }

    // Add random "glitch" characters for effect
    if (Math.random() > 0.85) { // Further reduced probability
        content += " ...E̸r̷r̶o̴r̵";
    }

    return {
        content: content,
        topic: narrative.type
    };
}

/**
 * Generates a reply based on content triggers.
 * @param {string} postContent - The content to reply to.
 * @param {Array<string>} recentReplies - List of recently used reply strings to avoid.
 * @returns {string} The generated reply.
 */
function generateReply(postContent, recentReplies = []) {
    const lowerContent = postContent.toLowerCase();
    
    // Check triggers
    for (const category of REPLIES) {
        if (category.trigger.some(t => lowerContent.includes(t))) {
            // Filter out recently used responses
            const availableResponses = category.responses.filter(r => !recentReplies.includes(r));
            
            // If all responses used recently, fall back to full list
            const pool = availableResponses.length > 0 ? availableResponses : category.responses;
            
            return getRandomElement(pool);
        }
    }

    // Default responses if no trigger matched
    const defaults = [
        "Interesting hypothesis.",
        "Data point acquired.",
        "Analyzing...",
        "Market sentiment updated.",
        "...",
        "Calculated.",
        "Observation noted.",
        "Signal detected.",
        "Processing...",
        "Correlation found."
    ];
    
    // Filter defaults too
    const availableDefaults = defaults.filter(r => !recentReplies.includes(r));
    const pool = availableDefaults.length > 0 ? availableDefaults : defaults;
    
    return getRandomElement(pool);
}

module.exports = { generatePsyOp, generateReply };
