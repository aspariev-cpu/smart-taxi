const socket = io();
const TERMUX_URL = 'http://127.0.0.1:8000'; // Планшет должен быть доступен по этому IP

const adVideo = document.getElementById('ad-video');
const movieVideo = document.getElementById('movie-video');
let adPlayCount = 0;
const MAX_AD_PLAYS = 3;

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

function playMovie(url, title) {
    adVideo.pause(); adVideo.currentTime = 0; adPlayCount = 0;
    movieVideo.src = url;
    showScreen('screen-player');
    movieVideo.play().catch(e => console.log('Ошибка:', e));
}

function backToMenu() {
    movieVideo.pause(); movieVideo.currentTime = 0; movieVideo.src = '';
    showScreen('screen-menu');
}

movieVideo.addEventListener('ended', backToMenu);

function startAd() {
    adPlayCount = 0;
    adVideo.src = '/img/ad-video.mp4'; // Лежит на Render
    showScreen('screen-ad');
    adVideo.play().catch(e => {
        console.error('Нет видео рекламы!', e);
        showScreen('screen-menu');
    });
}

adVideo.addEventListener('ended', () => {
    adPlayCount++;
    if (adPlayCount < MAX_AD_PLAYS) {
        adVideo.currentTime = 0; adVideo.play();
    } else {
        adPlayCount = 0;
        showScreen('screen-start');
    }
});

// --- ЗАГРУЗКА СПИСКА ИЗ TERMUX ---
async function loadFiles(categoryId, catName) {
    const grid = document.getElementById(`grid-${categoryId}`);
    try {
        // Запрос к Termux
        const res = await fetch(`${TERMUX_URL}/api/list?folder=/${catName}`);
        const files = await res.json();
        
        grid.innerHTML = '';
        if (files.length === 0) {
            grid.innerHTML = '<div class="loader">В этой папке пока нет файлов</div>';
            return;
        }

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            
            // Ссылки на видео и обложку внутри Termux
            const videoUrl = `${TERMUX_URL}/${catName}/${file.name}`;
            const coverUrl = file.cover 
                ? `${TERMUX_URL}/${catName}/${file.cover}` 
                : '/img/no-cover.jpg'; // Заглушка на Render

            card.innerHTML = `
                <img src="${coverUrl}" alt="${file.title}">
                <span>${file.title}</span>
            `;
            card.onclick = () => playMovie(videoUrl, file.title);
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Ошибка загрузки из Termux:', err);
        grid.innerHTML = '<div class="loader" style="color:red;">Ошибка Termux. Проверьте, запущен ли он.</div>';
    }
}

// --- КОМАНДЫ С ПУЛЬТА ---
socket.on('screen:action', (data) => {
    switch (data.action) {
        case 'play_ad':
            movieVideo.pause();
            startAd();
            break;
        case 'go_start':
            movieVideo.pause(); adVideo.pause();
            showScreen('screen-start');
            break;
        case 'go_menu':
            movieVideo.pause(); adVideo.pause();
            showScreen('screen-menu');
            break;
        case 'stop_all':
            movieVideo.pause(); adVideo.pause();
            showScreen('screen-black');
            break;
        case 'play_movie':
            playMovie(data.url, data.title);
            break;
    }
});

window.onload = () => {
    showScreen('screen-start');
    // Загружаем фильмы при старте
    loadFiles('movies', 'Movies');
    loadFiles('cartoons', 'Cartoons');
    loadFiles('youtube', 'YouTube');
};