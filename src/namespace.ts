import { Server } from './server';
import { Room } from './room';
import { Adapter } from './adapter';
import { EventEmitter } from 'events';
import { WebSocketServer } from 'ws';
import { ServerSideClient } from './client-server';

export class Namespace {
    public server: Server;

    public ws: WebSocketServer;

    public rooms: Map<string, Room | ServerSideClient> = new Map();

    public events: EventEmitter = new EventEmitter();

    constructor(public namespace: string, server: Server, ws: WebSocketServer) {
        this.server = server;
        this.ws = ws;
    }


    public except(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).except(room);
    }

    public emit(name: string, ...args: any[]) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).emit(name, ...args);
    }

    public on(event: string, listener: any) {
        this.events.on(event, listener);
    }

    public to(room: string) {
        const adapter = new Adapter(this.server);
        return adapter.of(this.namespace).to(room);
    }

    public in(room: string) {
        return this.to(room);
    }
}