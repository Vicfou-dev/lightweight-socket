const { Server } = require('../dist/index.js');

const server = new Server({ port: 3000 });

server.on('connection', (client) => {
    console.log('A client connected');

    client.on('message', (data) => {
        console.log('Received message from client:', data);
        server.emit('message', 'Hello from server');
    });
});