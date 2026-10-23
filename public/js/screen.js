const socket = io();

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if (!target) return;

    target.classList.add('active');
    socket.emit('screen_changed', id);

    let animatedElement = null;
    if (id === 'screen-tips') animatedElement = target.querySelector('.pay-card');
    if (id === 'screen-rating') animatedElement = target.querySelector('.rating-card');
    if (id === 'screen-selected') animatedElement = target.querySelector('.selected-content');

    if (animatedElement) {
        // Сбрасываем анимацию
        animatedElement.classList.remove('anim-slide-up', 'anim-scale-in', 'anim-fade-up');
        void animatedElement.offsetWidth; 
        
        // Включаем (длительность задана в CSS — 3 секунды)
        if (id === 'screen-tips') animatedElement.classList.add('anim-slide-up');
        if (id === 'screen-rating') animatedElement.classList.add('anim-scale-in');
        if (id === 'screen-selected') animatedElement.classList.add('anim-fade-up');
    }
}

function toggleCategory(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.category').forEach(c => c.classList.remove('open'));
    if (!isOpen) el.classList.add('open');
}

function selectMovie(title) {
    const titleEl = document.getElementById('selected-title');
    if (titleEl) titleEl.innerText = title;
    showScreen('screen-selected');
    
    fetch('/api/movie-clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title })
    }).catch(err => console.error('Ошибка вебхука:', err));
}

async function loadCatalog() {
    try {
        const res = await fetch('/api/movies');
        const movies = await res.json();
        renderCatalog(movies);
    } catch (err) { console.error('Ошибка загрузки каталога:', err); }
}

function renderCatalog(movies) {
    const gridMovies = document.getElementById('grid-movies');
    const gridCartoons = document.getElementById('grid-cartoons');
    if (!gridMovies || !gridCartoons) return;
    gridMovies.innerHTML = '';
    gridCartoons.innerHTML = '';

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

socket.on('screen:action', (data) => {
    switch (data.action) {
        case 'go_menu': showScreen('screen-menu'); break;
        case 'stop_all': showScreen('screen-black'); break;
        case 'show_tips': showScreen('screen-tips'); break;
        case 'show_rating': showScreen('screen-rating'); break;
    }
});

socket.on('refresh_catalog', () => loadCatalog());

window.onload = () => {
    loadCatalog();
    socket.emit('screen_changed', 'screen-menu');
};
