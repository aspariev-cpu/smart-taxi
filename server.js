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

app.get('/', (req, res) => res.redirect('/remote'));
app.get('/screen', (req, res) => res.render('screen'));
app.get('/remote', (req, res) => res.render('remote'));

io.on('connection', (socket) => {
    socket.on('remote:command', (data) => {
        io.emit('screen:action', data);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер Smart Такси запущен на порту ${PORT}`);
});