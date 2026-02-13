const fetch = require('cross-fetch');
require('dotenv').config();

const CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
};

async function sendTelegramAlert(message) {
    if (!CONFIG.botToken || !CONFIG.chatId) {
        // Silent fail if not configured, so it doesn't crash the agent
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`;
        const body = {
            chat_id: CONFIG.chatId,
            text: message,
            parse_mode: 'Markdown'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`Telegram Error: ${data.error_code} - ${data.description}`);
            if (data.description.includes('chat not found')) {
                console.error('👉 TIP: You must start the bot first! Search for your bot and click "Start".');
            }
        }
    } catch (error) {
        console.error('Failed to send Telegram alert:', error.message);
    }
}

module.exports = { sendTelegramAlert };
