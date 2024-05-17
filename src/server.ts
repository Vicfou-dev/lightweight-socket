import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { Namespace } from './namespace';
import { ServerSideClient } from './client-server';
import { Room } from './room';

interface ServerOptionInterface {
    port: number;
}

export class Server {

    private server: http.Server;

    public ws: WebSocketServer;

    public clients: Map<string, ServerSideClient> = new Map();

    private port: number;

    public namespaces: Map<string, Namespace> = new Map();

    public static isInitialized: boolean = false;

    constructor(options: ServerOptionInterface | number) {
        if (typeof options === 'number') {
            options = { port: options};
        }
        this.port = options.port;
        this.server = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': 'text/plain' })).listen(this.port);
        this.server.on('upgrade', this.upgrade.bind(this));
        const namespace = this.getNamespace('/');
        this.namespaces.set('/', namespace);
    }

    private upgrade(req: http.IncomingMessage, socket: any, head: Buffer) {
        const [namespacePath, id] = req.url.split('?id=');
        const namespace = this.getNamespace(namespacePath);
        const wss = namespace.ws;

        wss.handleUpgrade(req, socket, head, (socket) => this.handler(namespace, socket, namespacePath, id));
    }

    private handler(namespace: Namespace, socket: WebSocket, namespacePath: string, id: string) {
        const client = new ServerSideClient(namespacePath, id, socket, this);
        this.clients.set(client.id, client);
        namespace.rooms.set(client.id, client);
   
        client.on('close', () => this.clients.delete(client.id));
        client.on('join', (name) => {
            var room = null;
            if (!namespace.rooms.has(name)) {
                room = new Room(name);
                namespace.rooms.set(name, room)
                namespace.events.emit('create-room', room);
            }
            room = namespace.rooms.get(name) as Room;
            room.add(client);
            client.rooms.set(name, room);
            namespace.events.emit('join-room', room, client.id);
        });
        client.on('leave', (name) => {
            if (!namespace.rooms.has(name)) {
                return;
            }
            const room = namespace.rooms.get(name) as Room;
            room.remove(client);
            namespace.events.emit('leave-room', room, client.id);
            if (room.clients.size === 0) {
                namespace.events.emit('delete-room', room);
                namespace.rooms.delete(name);
            }
        });
        namespace.events.emit('connection', client);
    }

    private getNamespace(namespacePath: string): Namespace {
        if (this.namespaces.has(namespacePath)) return this.namespaces.get(namespacePath) as Namespace;

        const wss = new WebSocketServer({ noServer: true });
        wss.setMaxListeners(0);
        const namespace = new Namespace(namespacePath, this, wss);
        this.namespaces.set(namespacePath, namespace);
        return namespace;
    }

    public close() {
        this.clients.forEach(client => client.close());
        this.server.close();
    }

    public on(event: string, listener: any) {
        this.namespaces.forEach(namespace => namespace.events.on(event, listener));
    }

    public of(namespace: string): Namespace {
        return this.getNamespace(namespace);
    }
}