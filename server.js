require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. СОЗДАНИЕ ПАПОК И БАЗЫ ДАННЫХ ---
// Создаем папку для картинок, если её нет
const coversDir = path.join(__dirname, 'public', 'img', 'covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

// Подключаемся к базе (она создастся сама)
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

// Создаем таблицу фильмов
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        cover TEXT NOT NULL
    )`);
    console.log('✅ База данных и таблица готовы');
});

// --- 2. НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, coversDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// --- 3. МАРШРУТЫ ---
app.get('/', (req, res) => res.redirect('/remote'));
app.get('/screen', (req, res) => res.render('screen'));
app.get('/remote', (req, res) => res.render('remote'));
app.get('/admin', (req, res) => res.render('admin'));

// API: Получить фильмы
app.get('/api/movies', (req, res) => {
    db.all('SELECT * FROM movies ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Добавить фильм
app.post('/api/movies', upload.single('cover'), (req, res) => {
    const { title, category } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: 'Заполните все поля' });
    
    const coverPath = `/img/covers/${req.file.filename}`;
    db.run('INSERT INTO movies (title, category, cover) VALUES (?, ?, ?)', 
        [title, category, coverPath], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Отправляем сигнал всем экранам, чтобы они обновили список
            io.emit('refresh_catalog');
            res.json({ success: true });
        }
    );
});

// API: Удалить фильм
app.delete('/api/movies/:id', (req, res) => {
    db.run('DELETE FROM movies WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('refresh_catalog'); // Обновляем экраны
        res.json({ success: true });
    });
});

// --- DISCORD ---
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1553152502659022970/ys_saaXhvs9B9cRuA1uXprHliEHEmZajhIzLVNEm_hgY7Z1KTYj6GByijYKZw_fmw59A';
app.post('/api/movie-clicked', async (req, res) => {
    const { title } = req.body;
    try {
        await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `🍿 **Пассажир выбрал фильм:** ${title}`, username: 'Smart Такси' })
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Ошибка' }); }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    socket.on('remote:command', (data) => io.emit('screen:action', data));
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
