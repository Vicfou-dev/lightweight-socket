import { Server } from './server';
import { Event } from './event';
import { ServerSideClient } from './client-server';
import { Room } from './room';

export class Adapter {

    private server: Server;
    private rooms: Set<string>;
    private exceptions: Set<string>;
    private namespace: string | null;

    constructor(server: Server) {
        this.server = server;
        this.rooms = new Set();
        this.exceptions = new Set();
        this.namespace = null;
    }

    to(room: string) {
        this.rooms.add(room);
        return this;
    }

    except(clientId: string) {
        this.exceptions.add(clientId);
        return this;
    }

    in(room: string) {
        return this.to(room);
    }

    of(namespace: string) {
        this.namespace = namespace;
        return this;
    }

    emit(name: string, ...args: any[]) {
        const event = new Event(name, args);
        const message = event.toString();
        const namespace = this.server.namespaces.get(this.namespace ?? '/');
        
        if (!namespace) return;
 
        this.rooms.forEach(room => {
            if (!namespace.rooms.has(room)) {
                return;
            }

            const clients = namespace.rooms.get(room) instanceof ServerSideClient ? [namespace.rooms.get(room) as ServerSideClient] : (namespace.rooms.get(room) as Room).clients;
            
            clients.forEach(client => {
                if (this.exceptions.has(client.id)) return;
                client.socket.send(message);
            });
        });

        this.rooms.clear();
        this.exceptions.clear();
        this.namespace = null;
    }
}