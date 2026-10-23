const socket = io();

function sendCommand(action) {
    // Легкая вибрация при нажатии (если телефон поддерживает)
    if (navigator.vibrate) navigator.vibrate(50);
    socket.emit('remote:command', { action });
}

// Слушаем, какой экран открыт на планшете, и подсвечиваем кнопку
socket.on('remote_screen_changed', (screenId) => {
    // Снимаем класс active со всех кнопок
    document.querySelectorAll('.btn-control').forEach(btn => btn.classList.remove('active-btn'));

    // Добавляем класс active нужной кнопке
    if (screenId === 'screen-menu') document.getElementById('btn-menu').classList.add('active-btn');
    if (screenId === 'screen-tips') document.getElementById('btn-tips').classList.add('active-btn');
    if (screenId === 'screen-rating') document.getElementById('btn-rating').classList.add('active-btn');
    if (screenId === 'screen-black') document.getElementById('btn-stop').classList.add('active-btn');
});
