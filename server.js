require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Маршруты ---
app.get('/', (req, res) => res.redirect('/remote'));
app.get('/screen', (req, res) => res.render('screen'));
app.get('/remote', (req, res) => res.render('remote'));

// --- Вебхук Discord ---
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1553152502659022970/ys_saaXhvs9B9cRuA1uXprHliEHEmZajhIzLVNEm_hgY7Z1KTYj6GByijYKZw_fmw59A';

app.post('/api/movie-clicked', async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Нет названия' });

    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `🍿 **Пассажир выбрал фильм:** ${title}`,
                username: 'Smart Такси'
            })
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка отправки в Discord:', err);
        res.status(500).json({ error: 'Ошибка отправки' });
    }
});

// --- Socket.io ---
io.on('connection', (socket) => {
    socket.on('remote:command', (data) => {
        io.emit('screen:action', data);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер Smart Такси запущен на порту ${PORT}`);
});
