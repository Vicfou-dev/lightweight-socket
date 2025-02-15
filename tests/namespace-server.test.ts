import { Server, Client, ServerSideClient } from '../src/index';
import { test } from '@jest/globals';

test('test server',  (done) => {
    const port = 4000;
    const server = new Server(port);

    const babar = server.of('/babar');
    babar.on('connection', (client: ServerSideClient) => {
        console.log('babar');
        client.emit('hello', 'Hello World From Server !');

        babar.on('create-room', (room) => {
            console.log('create-room');
        });
        
        client.on('private-message', (message, toto) => {
            console.log(message, toto);
            done();
        });
    });

    const toto = server.of('/toto');
    toto.on('connection', (client: ServerSideClient) => {
        console.log('toto');
        client.emit('hello', 'Hello World From Server !');

        babar.on('create-room', (room) => {
            console.log('create-room');
        });
        
        client.on('private-message', (message, toto) => {
            console.log(message, toto);
            done();
        });
    });

    const firstClient = new Client(`ws://localhost:${port}/babar`);
    const secondClient = new Client(`ws://localhost:${port}/toto`);

    firstClient.on('hello', (data) => {
        console.log('hello');
        console.log(data);
        firstClient.emit('babar', 'Hello World From Client !');
    });

    secondClient.on('hello', (data) => {
        secondClient.emit('private-message', 'Hello World From Client !', 'babar');
    });

});