const { sendTelegramAlert } = require('./telegram_client');
require('dotenv').config();

console.log('Sending test message...');
sendTelegramAlert('🔔 *System Online:* Telegram connection established successfully.\n\nYour agent is now monitoring remotely.')
    .then(() => console.log('Test message sent!'))
    .catch(err => console.error('Error:', err));
