import { ServerSideClient } from './client-server';

export class Room {

    public clients: Map<string, ServerSideClient> = new Map();

    protected name: string;

    constructor(name: string) {
        this.name = name;
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