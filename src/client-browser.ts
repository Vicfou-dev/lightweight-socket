import {Event, EventInterface} from './event';
import { Emitter } from './event';

export class BrowserClient extends Emitter {
    protected socket: WebSocket;

    public id: string;

    constructor(url: string) {
        super();
        this.socket = new WebSocket(url);
        this.init();
        this.on('connect', (id) => this.id = id);
    }

    public emit(name: string, ...args: any[]) {
        const event = new Event(name, args);
        const message = event.toString();
        this.socket.send(message);
    }

    public close() {
        this.socket.close();
    }

    protected receive(event: MessageEvent) {
        const data = event.data;
        const parsedEvent = JSON.parse(data) as EventInterface;
        if (this.listeners[parsedEvent.name]) {
            this.listeners[parsedEvent.name].forEach(listener => listener(...parsedEvent.payload));
        }
    }

    protected init() {
        this.socket.addEventListener('message', this.receive.bind(this));
    }
}