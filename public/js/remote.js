const socket = io();

function sendCommand(action) {
    socket.emit('remote:command', { action });
}
