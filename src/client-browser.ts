import {Event, EventInterface} from './event';

export class BrowserClient {
    protected socket: WebSocket;
    protected listeners: { [event: string]: Function[] } = {};

    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.init();
    }

    public on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    public emit(name: string, ...args: any[]) {
        const event = new Event(name, args);
        const message = event.toString();
        this.socket.send(message);
    }

    public once(event: string, listener: Function) {
        const onceListener = (...args: any[]) => {
            this.off(event, onceListener);
            listener.apply(this, args);
        };
        this.on(event, onceListener);
    }

    public off(event: string, listener: Function) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
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