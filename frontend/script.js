
const socket = io.connect('http://localhost:8080');

socket.on('welcome', (message) => {
    console.log('Received from server:', message);
});

// Send a message to the server
socket.emit('message', 'Hello, server!');