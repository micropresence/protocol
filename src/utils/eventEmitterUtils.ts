import {EventEmitter} from "events";

export async function once<T>(emitter: EventEmitter, event: string): Promise<T> {
    return new Promise<T>(resolve => emitter.once(event, resolve));
}
