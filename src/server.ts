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
        const [namespacePath, query] = req.url.split('?');
        const namespace = this.getNamespace(namespacePath);
        const wss = namespace.ws;

        wss.handleUpgrade(req, socket, head, (socket) => this.handler(namespace, socket, namespacePath));
    }

    private handler(namespace: Namespace, socket: WebSocket, namespacePath: string) {
        const client = new ServerSideClient(namespacePath, socket, this);
        this.clients.set(client.id, client);
        namespace.rooms.set(client.id, client);
   
        client.on('close', () => this.clients.delete(client.id));
        client.on('join-room', (name) => {
            var room = null;
            if (!namespace.rooms.has(name)) {
                room = new Room(name);
                namespace.rooms.set(name, room)
                namespace.emit('create-room', room);
            }
            room = namespace.rooms.get(name) as Room;
            room.add(client);
            client.rooms.set(name, room);
            namespace.emit('join-room', room, client.id);
        });
        client.on('leave-room', (name) => {
            if (!namespace.rooms.has(name)) {
                return;
            }
            const room = namespace.rooms.get(name) as Room;
            room.remove(client);
            namespace.emit('leave-room', room, client.id);
            if (room.clients.size === 0) {
                namespace.emit('delete-room', room);
                namespace.rooms.delete(name);
            }
        });

        client.emit('connect', client.id);
        namespace.emit('connection', client);
    }

    public getNamespace(namespacePath: string): Namespace {
        if (this.namespaces.has(namespacePath)) return this.namespaces.get(namespacePath) as Namespace;

        const wss = new WebSocketServer({ noServer: true });
        wss.setMaxListeners(0);
        const namespace = new Namespace(namespacePath, this, wss);
        this.namespaces.set(namespacePath, namespace);
        return namespace;
    }

    public emit(name: string, ...args: any[]) {
        this.namespaces.forEach(namespace => {
            var adapter = namespace.adapter();
            namespace.rooms.forEach(room => adapter = adapter.to(room.id));
            adapter.emit(name, ...args);
        });
    }

    public close() {
        this.clients.forEach(client => client.close());
        this.server.close();
    }

    public on(event: string, listener: any) {
        this.namespaces.forEach(namespace => namespace.on(event, listener));
    }

    public of(namespace: string): Namespace {
        return this.getNamespace(namespace);
    }
}