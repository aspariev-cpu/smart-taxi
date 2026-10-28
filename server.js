require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ПАПКИ И БАЗА ДАННЫХ ---
const coversDir = path.join(__dirname, 'public', 'img', 'covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

const db = new Database('/tmp/database.db');

// Создаём таблицу
db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        cover TEXT NOT NULL
    )
`);
console.log('✅ База данных готова');

// --- ЗАГРУЗКА ФАЙЛОВ ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, coversDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// --- МАРШРУТЫ ---
app.get('/', (req, res) => res.redirect('/remote'));
app.get('/screen', (req, res) => res.render('screen'));
app.get('/remote', (req, res) => res.render('remote'));
app.get('/admin', (req, res) => res.render('admin'));

// API: Получить фильмы
app.get('/api/movies', (req, res) => {
    const movies = db.prepare('SELECT * FROM movies ORDER BY id DESC').all();
    res.json(movies);
});

// API: Добавить фильм
app.post('/api/movies', upload.single('cover'), (req, res) => {
    const { title, category } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: 'Заполните все поля' });

    const coverPath = `/img/covers/${req.file.filename}`;
    db.prepare('INSERT INTO movies (title, category, cover) VALUES (?, ?, ?)').run(title, category, coverPath);

    io.emit('refresh_catalog');
    res.json({ success: true });
});

// API: Удалить фильм
app.delete('/api/movies/:id', (req, res) => {
    db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
    io.emit('refresh_catalog');
    res.json({ success: true });
});

// --- DISCORD WEBHOOK ---
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
app.post('/api/movie-clicked', async (req, res) => {
    const { title } = req.body;
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `🍿 **Пассажир выбрал фильм:** ${title}`, username: 'Smart Такси' })
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка' });
    }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    // Команды с пульта на экран
    socket.on('remote:command', (data) => {
        io.emit('screen:action', data);
    });

    // Экран сообщает пульту, какой у него сейчас активен, чтобы подсветить кнопку
    socket.on('screen_changed', (screenId) => {
        io.emit('remote_screen_changed', screenId);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
