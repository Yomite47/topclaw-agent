const fetch = require('cross-fetch');
const fs = require('fs');
require('dotenv').config();

const CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : null
};

async function sendMessage(chatId, text) {
  if (!CONFIG.botToken) return;
  const url = `https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error('Telegram send error:', e.message);
  }
}

function loadSolanaStatus() {
  try {
    if (!fs.existsSync('solana_state.json')) return null;
    const raw = fs.readFileSync('solana_state.json', 'utf8');
    const state = JSON.parse(raw);
    return state;
  } catch (e) {
    return null;
  }
}

async function handleCommand(chatId, text) {
  const cmd = text.trim().toLowerCase();
  if (cmd === '/start' || cmd === '/help') {
    const msg = [
      'TopClaw Control Interface',
      '',
      '/status  Current trading status',
      '/help    This help message'
    ].join('\n');
    await sendMessage(chatId, msg);
    return;
  }
  if (cmd === '/status') {
    const state = loadSolanaStatus();
    if (!state) {
      await sendMessage(chatId, 'No Solana state available yet.');
      return;
    }
    const balance = typeof state.balance === 'number' ? state.balance.toFixed(4) : String(state.balance);
    const active = state.activeTrade;
    if (active) {
      const pnl = typeof active.pnlPercent === 'number' ? active.pnlPercent.toFixed(2) : '0.00';
      const symbol = active.symbol || 'Token';
      const price = typeof active.currentPrice === 'number' ? active.currentPrice : active.entryPrice;
      const msg = [
        `Solana Balance: ${balance} SOL`,
        `Active: ${symbol}`,
        `Entry: $${active.entryPrice}`,
        `Last: $${price}`,
        `PnL: ${pnl}%`
      ].join('\n');
      await sendMessage(chatId, msg);
    } else {
      await sendMessage(chatId, `Solana Balance: ${balance} SOL\nNo active trade.`);
    }
    return;
  }
  await sendMessage(chatId, 'Unknown command. Send /help for available commands.');
}

async function pollLoop() {
  if (!CONFIG.botToken) {
    console.error('Telegram bot token missing.');
    return;
  }
  let offset = 0;
  for (;;) {
    try {
      const url = `https://api.telegram.org/bot${CONFIG.botToken}/getUpdates?timeout=30&offset=${offset}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (!msg || !msg.text) continue;
          const chatId = String(msg.chat.id);
          await handleCommand(chatId, msg.text);
        }
      }
    } catch (e) {
      console.error('Telegram poll error:', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

pollLoop();
