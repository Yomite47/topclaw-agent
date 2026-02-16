const fetch = require('cross-fetch');
require('dotenv').config();

async function run() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('Missing TELEGRAM_BOT_TOKEN');
    return;
  }
  const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=5`;
  console.log('Requesting:', url.replace(token, '<TOKEN>'));
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Raw response:');
    console.log(text);
  } catch (e) {
    console.error('Network error:', e.message);
  }
}

run();

