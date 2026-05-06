"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInventorySocket = registerInventorySocket;
exports.broadcastInventorySync = broadcastInventorySync;
exports.broadcastStockUpdates = broadcastStockUpdates;
exports.broadcastReservationExpired = broadcastReservationExpired;
const drop_service_1 = require("../services/drop.service");
const ROOM = "inventory";
async function syncPayload() {
    const drops = await (0, drop_service_1.listActiveDropsDto)();
    return { drops };
}
function registerInventorySocket(io) {
    io.on("connection", (socket) => {
        void (async () => {
            socket.join(ROOM);
            try {
                socket.emit("inventory:sync", await syncPayload());
            }
            catch (err) {
                console.error("[socket] inventory:sync failed", err);
                socket.emit("inventory:error", { message: "Failed to load inventory" });
            }
        })();
    });
}
async function broadcastInventorySync(io) {
    if (!io)
        return;
    io.to(ROOM).emit("inventory:sync", await syncPayload());
}
function broadcastStockUpdates(io, updates) {
    if (!io)
        return;
    for (const u of updates) {
        io.to(ROOM).emit("stock:update", u);
    }
}
function broadcastReservationExpired(io, items) {
    if (!io || items.length === 0)
        return;
    io.to(ROOM).emit("reservation:expired", { items });
}
