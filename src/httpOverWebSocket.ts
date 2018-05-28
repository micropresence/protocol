import WebSocket from "ws";
import axios from "axios";
import {omit} from "ramda";

import {WebSocketMessenger} from "./WebSocketMessenger";
import {HeaderFields} from "./headerFields";

export interface Headers {
    [name: string]: string | string[] | undefined;
}

export interface RequestOptions {
    method: string;
    path: string;
    headers: Headers;
    body: any;
}

export interface Response {
    status: number;
    headers: Headers;
    body: any;
}

export interface RequestError {
    errorMessage: string;
}

const enum MessageType {
    Request = "redirectedRequest.Request",
    Response = "redirectedRequest.Response",
    RequestError = "redirectedRequest.RequestError"
}

export class HttpOverWebSocket {
    private static channel = "httpOverWebSocket";

    private wsMessenger: WebSocketMessenger;

    constructor(webSocket: WebSocket) {
        this.wsMessenger = new WebSocketMessenger(webSocket);
    }

    async request(request: RequestOptions): Promise<Response | RequestError> {
        const response = await this.wsMessenger.request<RequestOptions>(
            HttpOverWebSocket.channel,
            MessageType.Request,
            request
        );
        if (response.messageType !== MessageType.Response && response.messageType !== MessageType.RequestError) {
            throw new Error("Unexpected response");
        }
        return response.message;
    }

    initRequestFulfillment(targetHost: string) {
        this.wsMessenger.onChannelMessage(
            HttpOverWebSocket.channel,
            async ({dialogId, channel, messageType, message}) => {
                if (messageType !== MessageType.Request || !HttpOverWebSocket.isRequestOptions(message)) {
                    return; // just ignore
                }
                const {status, headers, data} = await axios.request({
                    method: message.method,
                    baseURL: `http://${targetHost}`,
                    url: message.path,
                    headers: HttpOverWebSocket.omitHeaders(message.headers),
                    data: message.body,
                    validateStatus: undefined
                });
                const response: Response = {status, headers, body: data};
                this.wsMessenger.send(channel, MessageType.Response, response, dialogId);
            }
        );
    }

    static isRequestOptions(candidate: any): candidate is RequestOptions {
        return (
            candidate !== null &&
            typeof candidate === "object" &&
            typeof candidate.method === "string" &&
            typeof candidate.path === "string" &&
            typeof candidate.headers === "object" &&
            candidate.headers !== null
        );
    }

    static isResponse(candidate: any): candidate is Response {
        return (
            candidate !== null &&
            typeof candidate === "object" &&
            typeof candidate.status === "number" &&
            typeof candidate.headers === "object" &&
            candidate.headers !== null
        );
    }

    static isRequestError(candidate: any): candidate is RequestError {
        return candidate !== null && typeof candidate === "object" && typeof candidate.errorMessage === "string";
    }

    private static omitHeaders = omit(["host", HeaderFields.AuthToken]);
}
