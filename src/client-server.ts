import { Event, EventInterface } from './event';
import { WebSocket } from 'ws';
import { Adapter } from './adapter';
import { Room } from './room';
import { Server } from './server';

export class AbstractClient {

    protected url: string;

    public socket: WebSocket;

    public id: string;

    public on(event: string, listener: any) {
        if (event === 'message') return;
        this.socket.on(event, listener);
    }

    public emit(name: string, ...args: any[]) {
        if (name === 'message') return;
        const event = new Event(name, args);
        const message = event.toString();
        this.socket.send(message);
    }

    public once(event: string, listener: any) {
        if (event === 'message') return;
        this.socket.once(event, listener);
    }

    public off(event: string, listener: any) {
        if (event === 'message') return;
        this.socket.off(event, listener);
    }

    public close() {
        this.socket.close();
    }

    protected receive(data: string | Buffer) {
        if (Buffer.isBuffer(data)) {
            data = data.toString();
        }

        const event = JSON.parse(data) as EventInterface;
        this.socket.emit(event.name, ...event.payload);
    }

    protected init() {
        this.socket.on('message', this.receive.bind(this));
    }
}

export class Client extends AbstractClient {
    constructor(url: string) {
        super();
        this.url = url;
        this.id = Math.random().toString(36).substr(2, 12);
        this.socket = new WebSocket(`${url}?id=${this.id}`);
        this.init();
    }
}

export class ServerSideClient extends AbstractClient {

    public rooms: Map<string, Room | ServerSideClient> = new Map();

    constructor(url: string, id: string, socket: WebSocket, private server: Server) {
        super();
        this.socket = socket;
        this.url = url;
        this.id = id;
        this.init();
        this.rooms.set(this.id, this);
    }

    public join(room: string) {
        this.socket.emit('join', room);
    }

    public leave(room: string) {
        this.socket.emit('leave', room);
    }

    public to(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.url).to(room);
    }

    public in(room: string) {
        return this.to(room);
    }

    public except(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.url).except(room);
    }

    public emit(name: string, ...args: any[]) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.url).to(this.id).emit(name, ...args);
    }
}