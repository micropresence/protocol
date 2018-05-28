export const enum MessageType {
    Request = "clientRegistration.Request",
    Ok = "clientRegistration.Ok",
    Rejection = "clientRegistration.Reject"
}

export interface Request {
    redirectHost: string;
}

export interface Ok {
    authToken: string;
}

export interface Rejection {
    reason: "redirectHostExists";
}

export type Response = Ok | Rejection;

export const channel = "clientRegistration";

export function isRequest(messageType: string, message: any): message is Request {
    return (
        messageType === MessageType.Request &&
        message !== null &&
        typeof message === "object" &&
        typeof message.redirectHost === "string"
    );
}

export function isOk(messageType: string, message: any): message is Ok {
    return (
        messageType === MessageType.Ok &&
        message !== null &&
        typeof message === "object" &&
        typeof message.authToken === "string"
    );
}

export function isRejection(messageType: string, message: any): message is Rejection {
    return (
        messageType === MessageType.Rejection &&
        message !== null &&
        typeof message === "object" &&
        typeof message.reason === "string"
    );
}
