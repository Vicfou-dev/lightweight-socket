export interface EventInterface {
    name: string;
    payload: Array<string | number | [] | {}>;
}

export class Event implements EventInterface {

    public name: EventInterface['name']

    public payload: EventInterface['payload']

    constructor(name: string, payload: EventInterface['payload']) {
        this.name = name;
        this.payload = payload;
    }

    toString() {
        return JSON.stringify({ name: this.name, payload: this.payload });
    }
}

export class Emitter {

    protected listeners: { [event: string]: Function[] } = {};

    public on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
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

}
