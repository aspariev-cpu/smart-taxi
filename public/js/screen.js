const socket = io();

// --- МАССИВ ФИЛЬМОВ ---
// Меняй названия и пути к обложкам. Картинки клади в public/img/covers/
const moviesList = [
    { id: 1, title: 'Чебурашка', cover: '/img/covers/cheburashka.jpg', category: 'movies' },
    { id: 2, title: 'Джон Уик', cover: '/img/covers/john-wick.jpg', category: 'movies' },
    { id: 3, title: 'Шрек', cover: '/img/covers/shrek.jpg', category: 'cartoons' },
    { id: 4, title: 'Мадагаскар', cover: '/img/covers/madagascar.jpg', category: 'cartoons' }
];

// --- УПРАВЛЕНИЕ ЭКРАНАМИ ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleCategory(id) {
    const el = document.getElementById(id);
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.category').forEach(c => c.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
}

function backToMenu() {
    showScreen('screen-menu');
}

// --- КЛИК ПО ФИЛЬМУ ---
function selectMovie(title) {
    // 1. Показываем экран с названием
    document.getElementById('selected-title').innerText = title;
    showScreen('screen-selected');

    // 2. Отправляем уведомление на сервер (в Discord)
    fetch('/api/movie-clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
    }).catch(err => console.error('Ошибка вебхука:', err));
}

// --- РЕНДЕР КАТАЛОГА ---
function renderCatalog() {
    const gridMovies = document.getElementById('grid-movies');
    const gridCartoons = document.getElementById('grid-cartoons');

    moviesList.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${movie.cover}" alt="${movie.title}" onerror="this.src='/img/no-cover.jpg'">
            <span>${movie.title}</span>
        `;
        card.onclick = () => selectMovie(movie.title);

        if (movie.category === 'movies') gridMovies.appendChild(card);
        if (movie.category === 'cartoons') gridCartoons.appendChild(card);
    });
}

// --- КОМАНДЫ С ПУЛЬТА ---
socket.on('screen:action', (data) => {
    switch (data.action) {
        case 'go_start':
            showScreen('screen-start');
            break;
        case 'go_menu':
            showScreen('screen-menu');
            break;
        case 'stop_all':
            showScreen('screen-black');
            break;
    }
});

// --- ЗАПУСК ---
window.onload = () => {
    showScreen('screen-start');
    renderCatalog();
};
