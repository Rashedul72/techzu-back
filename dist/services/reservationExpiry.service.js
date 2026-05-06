"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepExpiredReservations = sweepExpiredReservations;
exports.startReservationExpiryLoop = startReservationExpiryLoop;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const inventory_1 = require("../socket/inventory");
const SWEEP_MS = 2000;
async function sweepExpiredReservations(io) {
    const now = new Date();
    const outcome = await prisma_1.prisma.$transaction(async (tx) => {
        const rows = await tx.reservation.findMany({
            where: {
                status: client_1.ReservationStatus.ACTIVE,
                expiresAt: { lt: now },
            },
            select: {
                id: true,
                dropId: true,
                user: { select: { username: true } },
            },
        });
        if (rows.length === 0) {
            return { expired: [], stocks: [] };
        }
        const byDrop = new Map();
        const expired = [];
        for (const r of rows) {
            expired.push({ dropId: r.dropId, username: r.user.username });
            const ids = byDrop.get(r.dropId) ?? [];
            ids.push(r.id);
            byDrop.set(r.dropId, ids);
        }
        await tx.reservation.updateMany({
            where: { id: { in: rows.map((r) => r.id) } },
            data: { status: client_1.ReservationStatus.EXPIRED },
        });
        const dropIds = [...byDrop.keys()];
        for (const [dropId, ids] of byDrop) {
            await tx.drop.update({
                where: { id: dropId },
                data: { availableStock: { increment: ids.length } },
            });
        }
        const stocks = await tx.drop.findMany({
            where: { id: { in: dropIds } },
            select: { id: true, availableStock: true },
        });
        return {
            expired,
            stocks: stocks.map((s) => ({
                dropId: s.id,
                availableStock: s.availableStock,
            })),
        };
    });
    if (outcome.expired.length === 0)
        return;
    (0, inventory_1.broadcastStockUpdates)(io, outcome.stocks);
    (0, inventory_1.broadcastReservationExpired)(io, outcome.expired);
    await (0, inventory_1.broadcastInventorySync)(io);
}
function startReservationExpiryLoop(io) {
    const id = setInterval(() => {
        void sweepExpiredReservations(io).catch((err) => {
            console.error("[expiry]", err);
        });
    }, SWEEP_MS);
    return () => clearInterval(id);
}
