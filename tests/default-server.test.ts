import { Server, Client, ServerSideClient } from '../src/index';
import { test } from '@jest/globals';

test('test server',  (done) => {
    const server = new Server(3000);

    server.on('connection', (client: ServerSideClient) => {
        client.emit('hello', 'Hello World From Server !');

        server.on('create-room', (room) => {
            console.log('create-room');
        });
        
        client.on('private-message', (message, toto) => {
            console.log(message, toto);
            done();
        });

    });

    const firstClient = new Client('ws://localhost:3000');
    const secondClient = new Client('ws://localhost:3000');

    firstClient.on('hello', (data) => {
        console.log(data);
        firstClient.emit('babar', 'Hello World From Client !');
    });

    secondClient.on('hello', (data) => {
        secondClient.emit('private-message', 'Hello World From Client !', firstClient.id);
    });

});