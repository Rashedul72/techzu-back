"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientOrigin = clientOrigin;
exports.httpPort = httpPort;
function clientOrigin() {
    return process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
}
function httpPort() {
    const n = Number(process.env.PORT);
    return Number.isFinite(n) && n > 0 ? n : 3001;
}
