const socket = io();

// Функция для отправки базовых команд (реклама, стоп и т.д.)
function sendCommand(action) {
    socket.emit('remote:command', { action });
}

// Функция для запуска фильма (отправляет команду на экран планшета)
function playMovie(url, title) {
    socket.emit('remote:command', { 
        action: 'play_movie', 
        url: url, 
        title: title 
    });
}

// --- ЛОГИКА ПОЛУЧЕНИЯ СПИСКА ФИЛЬМОВ С ПЛАНШЕТА ---

// Функция для загрузки списка фильмов из Termux
async function loadRemoteList() {
    const listDiv = document.getElementById('remote-movie-list');
    const ipInput = document.getElementById('tablet-ip');
    
    // Берем IP из поля ввода. Если пусто, используем стандартный
    let tabletIp = ipInput ? ipInput.value.trim() : '127.0.0.1';
    
    // Если IP не введен, показываем подсказку
    if (!tabletIp) {
        listDiv.innerHTML = '<div style="color:#facc15; padding:10px;">Введите IP планшета выше (например, 192.168.1.50)</div>';
        return;
    }

    // Формируем адрес Termux (порт 8000)
    const TERMUX_URL = `http://${tabletIp}:8000`;

    listDiv.innerHTML = '<div style="color:#888; padding:10px;">Загрузка фильмов с планшета...</div>';

    try {
        // Запрашиваем список фильмов из папки Movies
        const res = await fetch(`${TERMUX_URL}/api/list?folder=/Movies`);
        
        if (!res.ok) throw new Error('Ошибка сети');
        
        const files = await res.json();
        
        listDiv.innerHTML = '';
        if (files.length === 0) {
            listDiv.innerHTML = '<div style="color:#888; padding:10px;">На планшете пока нет фильмов в папке Movies</div>';
            return;
        }

        // Рисуем список
        files.forEach(file => {
            // Ссылка на видео, которая откроется на планшете
            const videoUrl = `${TERMUX_URL}/Movies/${file.name}`;
            
            const item = document.createElement('div');
            item.className = 'movie-item';
            item.innerHTML = `<span>${file.title}</span> <span>▶️</span>`;
            
            // По клику отправляем команду на планшет
            item.onclick = () => playMovie(videoUrl, file.title);
            
            listDiv.appendChild(item);
        });
    } catch (err) {
        console.error('Ошибка загрузки списка:', err);
        listDiv.innerHTML = '<div style="color:#ef4444; padding:10px;">Не удалось подключиться к планшету. Проверьте IP и Wi-Fi.</div>';
    }
}

// Запуск загрузки при открытии страницы
window.onload = () => {
    // Восстанавливаем IP из памяти телефона, если он уже вводил его
    const ipInput = document.getElementById('tablet-ip');
    if (ipInput) {
        const savedIp = localStorage.getItem('tabletIp');
        if (savedIp) ipInput.value = savedIp;
        
        // Сохраняем IP при изменении
        ipInput.addEventListener('change', () => {
            localStorage.setItem('tabletIp', ipInput.value.trim());
        });
    }
    
    // Пытаемся загрузить список сразу при открытии (если IP уже есть)
    loadRemoteList();
};