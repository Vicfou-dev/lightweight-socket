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
