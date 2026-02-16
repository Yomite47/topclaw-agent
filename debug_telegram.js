const fetch = require('cross-fetch');
require('dotenv').config();

async function debugTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log(`Debug: Using Token prefix: ${token ? token.substring(0, 5) : 'MISSING'}...`);
    console.log(`Debug: Using Chat ID: ${chatId}`);

    if (!token || !chatId) {
        console.error('Missing credentials!');
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: "🔍 *Debug Message:* If you see this, the connection is working.",
        parse_mode: 'Markdown'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('--- Telegram API Response ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('-----------------------------');

    } catch (error) {
        console.error('Network Error:', error);
    }
}

debugTelegram();
