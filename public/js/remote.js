const socket = io();

function sendCommand(action) {
    if (navigator.vibrate) navigator.vibrate(50);
    socket.emit('remote:command', { action });
}

socket.on('remote_screen_changed', (screenId) => {
    document.querySelectorAll('.btn-control').forEach(btn => btn.classList.remove('active-btn'));

    if (screenId === 'screen-slideshow') document.getElementById('btn-slideshow').classList.add('active-btn');
    if (screenId === 'screen-menu') document.getElementById('btn-menu').classList.add('active-btn');
    if (screenId === 'screen-tips') document.getElementById('btn-tips').classList.add('active-btn');
    if (screenId === 'screen-rating') document.getElementById('btn-rating').classList.add('active-btn');
    if (screenId === 'screen-nochange') document.getElementById('btn-nochange').classList.add('active-btn'); // <--- НОВОЕ
    if (screenId === 'screen-black') document.getElementById('btn-stop').classList.add('active-btn');
});
