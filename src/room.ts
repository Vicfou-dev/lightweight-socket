import { ServerSideClient } from './client-server';

export class Room {

    public clients: Map<string, ServerSideClient> = new Map();

    public id: string;

    constructor(name: string) {
        this.id = name;
    }

    public add(client: ServerSideClient) {
        const clientId = client.id;
        this.clients.set(clientId, client);
        client.on('close', () => this.clients.delete(clientId));
    }

    public remove(client: ServerSideClient) {
        const clientId = client.id;
        this.clients.delete(clientId);
    }
}