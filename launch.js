const path = require('path');
const vault = require(path.join(__dirname, '..', '..', '..', 'security', 'secret-vault', 'vault-loader'));

// Try loading tokens from vault
try {
  process.env.TELEGRAM_BOT_TOKEN = vault.getKey('bots', 'telegram_bot_token', 'launcher');
  console.log('[LAUNCHER] Telegram token loaded');
} catch (e) {
  console.log('[LAUNCHER] No Telegram token:', e.message);
}

try {
  process.env.MAX_BOT_TOKEN = vault.getKey('bots', 'max_bot_token', 'launcher');
  console.log('[LAUNCHER] MAX token loaded');
} catch (e) {
  console.log('[LAUNCHER] No MAX token:', e.message);
}

try {
  process.env.OPENAI_API_KEY = vault.getKey('ai', 'openai_api_key', 'launcher');
  console.log('[LAUNCHER] OpenAI key loaded from vault');
} catch (e) {
  console.log('[LAUNCHER] OpenAI key not set — using local Ollama');
  process.env.OPENAI_BASE_URL = 'http://127.0.0.1:11434/v1';
  process.env.OPENAI_API_KEY = 'ollama';
  process.env.AI_MODEL = 'qwen2.5:7b';
  console.log('[LAUNCHER] Ollama mode active (qwen2.5:7b)');
}

require('./index.js');
