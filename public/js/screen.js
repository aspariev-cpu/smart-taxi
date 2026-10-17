const socket = io();

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

function backToMenu() { showScreen('screen-menu'); }

function selectMovie(title) {
    document.getElementById('selected-title').innerText = title;
    showScreen('screen-selected');
    fetch('/api/movie-clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
    }).catch(err => console.error(err));
}

// --- ЗАГРУЗКА И РЕНДЕР ---
async function loadCatalog() {
    try {
        const res = await fetch('/api/movies');
        const movies = await res.json();
        renderCatalog(movies);
    } catch (err) { console.error('Ошибка загрузки:', err); }
}

function renderCatalog(movies) {
    const gridMovies = document.getElementById('grid-movies');
    const gridCartoons = document.getElementById('grid-cartoons');
    gridMovies.innerHTML = '';
    gridCartoons.innerHTML = '';

    if (movies.length === 0) {
        gridMovies.innerHTML = '<div style="color:#888; padding:20px;">Нет фильмов</div>';
        return;
    }

    movies.forEach(movie => {
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

// --- КОМАНДЫ И АВТООБНОВЛЕНИЕ ---
socket.on('screen:action', (data) => {
    switch (data.action) {
        case 'go_start': showScreen('screen-start'); break;
        case 'go_menu': showScreen('screen-menu'); break;
        case 'stop_all': showScreen('screen-black'); break;
        case 'show_tips': showScreen('screen-tips'); break;
    }
});

// Если админ добавил/удалил фильм — обновляем список
socket.on('refresh_catalog', () => {
    console.log('🔄 Список фильмов обновлен');
    loadCatalog();
});

window.onload = () => {
    showScreen('screen-start');
    loadCatalog();
};
