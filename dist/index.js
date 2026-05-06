"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const serverConfig_1 = require("./lib/serverConfig");
const inventory_1 = require("./socket/inventory");
const reservationExpiry_service_1 = require("./services/reservationExpiry.service");
const port = (0, serverConfig_1.httpPort)();
const corsOrigin = (0, serverConfig_1.clientOrigin)();
const io = new socket_io_1.Server({
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"],
    },
});
const expressApp = (0, app_1.createApp)(io);
const httpServer = http_1.default.createServer(expressApp);
io.attach(httpServer);
(0, inventory_1.registerInventorySocket)(io);
(0, reservationExpiry_service_1.startReservationExpiryLoop)(io);
httpServer.listen(port, () => {
    console.log(`API http://localhost:${port}`);
});
