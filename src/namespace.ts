import { Server } from './server';
import { Room } from './room';
import { Adapter } from './adapter';
import { Emitter } from './event';
import { WebSocketServer } from 'ws';
import { ServerSideClient } from './client-server';

export class Namespace extends Emitter {
    public server: Server;

    public ws: WebSocketServer;

    public rooms: Map<string, Room | ServerSideClient> = new Map();

    constructor(public namespace: string, server: Server, ws: WebSocketServer) {
        super();
        this.server = server;
        this.ws = ws;
    }

    public except(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).except(room);
    }

    public emit(name: string, ...args: any[]) {
        if (name === 'create-room' || name === 'join-room' || name === 'leave-room' || name === 'delete-room' || name === 'connection' || name === 'close') {
            if (this.listeners[name]) {
                this.listeners[name].forEach(listener => listener(...args));
            }
            return
        }
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).emit(name, ...args);
    }

    public adapter() {
        return new Adapter(this.server);
    }

    public to(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).to(room);
    }

    public in(room: string) {
        return this.to(room);
    }
}