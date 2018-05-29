import {EventEmitter} from "events";
import WebSocket from "ws";
import * as uuid from "uuid";

import {parseJsonSafely} from "./utils/parseJsonSafely";
import {once} from "./utils/eventEmitterUtils";

export interface WrappedMessage<M = any> {
    dialogId: string;
    channel: string;
    messageType: string;
    message: M;
}

export class WebSocketMessenger {
    private messageEmitter = new EventEmitter();

    constructor(private ws: WebSocket) {
        this.initMessageEmitting();
    }

    async send<M = any>(channel: string, messageType: string, message: any, dialogId = uuid.v4()): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // TODO: add timeout
            const wrappedMessage: WrappedMessage = {dialogId, channel, messageType, message};
            this.ws.send(JSON.stringify(wrappedMessage), err => (err ? reject(err) : resolve(dialogId)));
        });
    }

    async request<Req = any, Res = any>(
        channel: string,
        messageType: string,
        request: Req
    ): Promise<WrappedMessage<Res>> {
        const dialogId = uuid.v4();
        // add response listener before sending request
        const responsePromise = this.nextByDialog(dialogId);
        await this.send(channel, messageType, request, dialogId);
        const response = await responsePromise;
        if (!WebSocketMessenger.isWrappedMessage(response)) {
            throw new Error("Received response was not wrapped correctly");
        }
        return response;
    }

    onChannelMessage<M = any>(channel: string, listener: (wrappedMessage: WrappedMessage<M>) => void): void {
        this.messageEmitter.on(WebSocketMessenger.channelEventName(channel), listener);
    }

    async nextByDialog<M = any>(dialogId: string): Promise<WrappedMessage<M>> {
        return this.next(WebSocketMessenger.dialogEventName(dialogId));
    }

    async nextByChannel<M = any>(channel: string): Promise<WrappedMessage<M>> {
        return this.next(WebSocketMessenger.channelEventName(channel));
    }

    private async next<M = any>(event: string): Promise<WrappedMessage<M>> {
        return once<WrappedMessage<M>>(this.messageEmitter, event);
    }

    private static dialogEventName(dialogId: string): string {
        return `dialogId:${dialogId}`;
    }

    private static channelEventName(channel: string): string {
        return `channel:${channel}`;
    }

    private static isWrappedMessage(candidate: any): candidate is WrappedMessage {
        return (
            candidate !== null &&
            typeof candidate === "object" &&
            typeof candidate.dialogId === "string" &&
            candidate.message !== undefined
        );
    }

    private initMessageEmitting(): void {
        this.ws.on("message", data => {
            const wrappedMessage = parseJsonSafely(data);
            if (!WebSocketMessenger.isWrappedMessage(wrappedMessage)) {
                return; // TODO
            }
            const {dialogId, channel} = wrappedMessage;
            this.messageEmitter.emit(WebSocketMessenger.dialogEventName(dialogId), wrappedMessage);
            this.messageEmitter.emit(WebSocketMessenger.channelEventName(channel), wrappedMessage);
        });
    }
}
