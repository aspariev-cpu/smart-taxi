const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// ⚠️ ВСТАВЬ СВОЙ DISCORD WEBHOOK
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1553152502659022970/ys_saaXhvs9B9cRuA1uXprHliEHEmZajhIzLVNEm_hgY7Z1KTYj6GByijYKZw_fmw59A';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/action', async (req, res) => {
  const { action, details } = req.body;
  if (!action) return res.status(400).json({ error: 'Нет действия' });

  const content = details
    ? `🚕 **${action}**\n↳ ${details}`
    : `🚕 **${action}**`;

  try {
    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!discordRes.ok) {
      console.error('Discord error:', await discordRes.text());
      return res.status(500).json({ error: 'Discord не принял' });
    }
    console.log(`✅ ${content}`);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => console.log(`🚕 http://localhost:${PORT}`));