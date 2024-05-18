import { Event, EventInterface } from './event';
import { WebSocket } from 'ws';
import { Adapter } from './adapter';
import { Room } from './room';
import { Server } from './server';
import { Emitter } from './event';

export class AbstractClient extends Emitter{

    protected url: string;

    public socket: WebSocket;

    public id: string;

    public emit(name: string, ...args: any[]) {
        if (name === 'message') return;
        const event = new Event(name, args);
        const message = event.toString();
        this.socket.send(message);
    }

    public close() {
        this.socket.close();
    }

    protected receive(data: string | Buffer) {
        
        if (Buffer.isBuffer(data)) {
            data = data.toString();
        }

        const parsedEvent = JSON.parse(data) as EventInterface;
        if (this.listeners[parsedEvent.name]) {
            this.listeners[parsedEvent.name].forEach(listener => listener(...parsedEvent.payload));
        }
    }

    protected init() {
        this.socket.on('message', this.receive.bind(this));
    }
}

export class Client extends AbstractClient {
    constructor(url: string) {
        super();
        this.url = url;
        this.socket = new WebSocket(`${url}`);
        this.init();
        this.socket.on('connect', (id) => this.id = id);
    }
}

export class ServerSideClient extends AbstractClient {

    public rooms: Map<string, Room | ServerSideClient> = new Map();

    constructor(url: string, socket: WebSocket, private server: Server) {
        super();
        this.socket = socket;
        this.url = url;
        this.id = Math.random().toString(36).substr(2, 12);
        this.init();
        this.rooms.set(this.id, this);
    }

    public join(room: string) {
        this.emit('join-room', room);
    }

    public leave(room: string) {
        this.emit('leave-room', room);
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
        if (name === 'join-room' || name === 'leave-room') {
            if (this.listeners[name]) {
                this.listeners[name].forEach(listener => listener(...args));
            }
            return
        }
        const adapter = new Adapter(this.server);
        return adapter.of(this.url).to(this.id).emit(name, ...args);
    }
}