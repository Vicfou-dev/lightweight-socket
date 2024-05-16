import * as http from "http";
import { EventEmitter } from "events";
import { WebSocket, WebSocketServer } from "ws";

interface EventInterface {
    name: string;
    payload: Array<string|number|[]|{}> ;
}

class Event implements EventInterface {
    
    public name : EventInterface['name']

    public payload : EventInterface['payload']
    
    constructor(name : string, payload : EventInterface['payload']) {
        this.name = name;
        this.payload = payload;
    }

    toString() {
        return JSON.stringify({ name: this.name, payload: this.payload });
    }
}

export class Server {

    private server: http.Server;

    private ws: WebSocketServer;

    private clients: Map<string, ServerSideClient> = new Map();

    private rooms: Map<string, Room> = new Map();

    public events: EventEmitter = new EventEmitter();

    constructor(port : number = 3000) {
        this.server = http.createServer((req, res) => res.writeHead(200, { 'Content-Type': 'text/plain' })).listen(port);
        this.ws = new WebSocketServer({ noServer: true });
        this.ws.setMaxListeners(0);
        this.server.on('upgrade', this.upgrade.bind(this));
    }

    private upgrade(req: http.IncomingMessage, socket: any, head: Buffer) {

        const handler = (socket) => {
            const [namespace, id] = req.url.split('?id=');
            const client = new ServerSideClient(namespace, id, socket);
            this.clients.set(client.id, client);
            client.on('close', () => delete this.clients[client.id]);
            client.on('join', (name) => {
                var room = null;
                if(!this.rooms.has(name)) {
                    room = new Room(name);
                    this.rooms.set(name, room)
                    this.events.emit('create-room', room);
                }
                room = this.rooms.get(name);
                room.add(client);
                client.rooms.set(name, room);
                this.events.emit('join-room', room, client.id);
            });
            client.on('leave', (name) => {
                if(!this.rooms.has(name)) {
                    return;
                }
                const room = this.rooms.get(name)
                room.remove(client);
                this.events.emit('leave-room', room, client.id);
                if(room.clients.size === 0) {
                    this.events.emit('delete-room', room);
                    this.rooms.delete(name);
                }
            });
            this.events.emit('connection', client);
        }

        this.ws.handleUpgrade(req, socket, head, handler);
    }

    public on(event: string, listener : any) {
        this.events.on(event, listener);
    }

    public close() {
        Object.keys(this.clients).forEach(clientId => this.clients[clientId].close());
        this.server.close();
    }

    public emit(name: string, ...args) : boolean{
        if(this.clients.size === 0) {
            return false;
        }
        const event = new Event(name, args);
        const message = event.toString();
        this.clients.forEach(client => client.socket.send(message));
        return true;
    }
}

class Room extends EventEmitter {
    
    public clients : Map<string, ServerSideClient> = new Map();
    
    protected name : string;
    
    constructor(name : string) {
        super();
        this.name = name;
    }
    
    public add(client : ServerSideClient) {
        const clientId = client.id;
        this.clients[clientId] = client;
        client.on('close', () => delete this.clients[clientId]);
    }

    public remove(client : ServerSideClient) {
        const clientId = client.id;
        delete this.clients[clientId];
    }
}

class AbstractClient {

    protected url : string;

    public socket : WebSocket;

    public id : string;

    public on(event: string, listener : any) {
        if(event === 'message') return;
        this.socket.on(event, listener);
    }

    public emit(name: string, ...args) {
        if(name === 'message') return;
        const event = new Event(name, args);
        const message = event.toString();
        this.socket.send(message);
    }

    public once(event: string, listener : any) {
        if(event === 'message') return;
        this.socket.once(event, listener);
    }

    public off(event: string, listener : any) {
        if(event === 'message') return;
        this.socket.off(event, listener);
    }

    public close() {
        this.socket.close();
    }
    
    protected receive(data: string | Buffer){
        if(Buffer.isBuffer(data)) {
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
    constructor(url : string) {
        super();
        this.url = url;
        this.id = Math.random().toString(36).substr(2, 12);
        this.socket = new WebSocket(`${url}?id=${this.id}`);
        this.init();
    }
}

export class ServerSideClient extends AbstractClient {

    public rooms : Map<string, Room|ServerSideClient> = new Map();

    constructor(url : string, id : string, socket : WebSocket) {
        super();
        this.socket = socket;
        this.url = url;
        this.id = id;
        this.init();
        this.rooms.set(this.id, this);
    }

    join(room : string) {
        this.socket.emit('join', room);
    }

    leave(room : string) {
        this.socket.emit('leave', room);
    }
    
}