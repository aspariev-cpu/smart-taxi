require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ПОДКЛЮЧЕНИЕ К NEON (БАЗА ДАННЫХ) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        cover TEXT NOT NULL
    )
`).then(() => console.log('✅ База данных Neon готова'))
  .catch(err => console.error('❌ Ошибка создания таблицы:', err));

// --- ПОДКЛЮЧЕНИЕ К SUPABASE (ХРАНИЛИЩЕ) ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Настройка Multer для хранения файла в памяти перед отправкой в облако
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Лимит 5 МБ на картинку
});

// --- МАРШРУТЫ ---
app.get('/', (req, res) => res.redirect('/remote'));
app.get('/screen', (req, res) => res.render('screen'));
app.get('/remote', (req, res) => res.render('remote'));
app.get('/admin', (req, res) => res.render('admin'));

// API: Получить фильмы
app.get('/api/movies', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка получения фильмов:', err);
        res.status(500).json({ error: err.message });
    }
});

// API: Добавить фильм (Загрузка в Supabase + сохранение в Neon)
app.post('/api/movies', upload.single('cover'), async (req, res) => {
    const { title, category } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: 'Заполните все поля' });

    try {
        // 1. Генерируем уникальное имя файла
        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        
        // 2. Загружаем картинку в Supabase Storage (bucket 'covers')
        const { data, error } = await supabase.storage
            .from('covers')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // 3. Получаем публичную ссылку на картинку
        const { data: publicUrlData } = supabase.storage
            .from('covers')
            .getPublicUrl(fileName);

        const coverPath = publicUrlData.publicUrl;

        // 4. Сохраняем фильм в базу Neon
        await pool.query(
            'INSERT INTO movies (title, category, cover) VALUES ($1, $2, $3)',
            [title, category, coverPath]
        );

        io.emit('refresh_catalog');
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        res.status(500).json({ error: err.message });
    }
});

// API: Удалить фильм
app.delete('/api/movies/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM movies WHERE id = $1', [req.params.id]);
        io.emit('refresh_catalog');
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления фильма:', err);
        res.status(500).json({ error: err.message });
    }
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
    socket.on('remote:command', (data) => {
        io.emit('screen:action', data);
    });

    socket.on('screen_changed', (screenId) => {
        io.emit('remote_screen_changed', screenId);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
