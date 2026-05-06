"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActiveDropsDto = listActiveDropsDto;
exports.reserveDropForUsername = reserveDropForUsername;
exports.purchaseDropForUsername = purchaseDropForUsername;
const client_1 = require("@prisma/client");
const httpError_1 = require("../lib/httpError");
const prisma_1 = require("../lib/prisma");
const user_service_1 = require("./user.service");
function activeVisibleWhere(now) {
    return {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    };
}
async function listActiveDropsDto() {
    const now = new Date();
    const drops = await prisma_1.prisma.drop.findMany({
        where: activeVisibleWhere(now),
        orderBy: { createdAt: "asc" },
        include: {
            purchases: {
                orderBy: { createdAt: "desc" },
                take: 3,
                include: {
                    user: { select: { username: true } },
                },
            },
        },
    });
    return drops.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        priceCents: d.priceCents,
        totalUnits: d.totalUnits,
        availableStock: d.availableStock,
        startsAt: d.startsAt.toISOString(),
        endsAt: d.endsAt?.toISOString() ?? null,
        recentPurchasers: d.purchases.map((p) => ({
            username: p.user.username,
            purchasedAt: p.createdAt.toISOString(),
        })),
    }));
}
async function reserveDropForUsername(dropId, username) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    return prisma_1.prisma.$transaction(async (tx) => {
        const user = await (0, user_service_1.ensureUserInTransaction)(tx, username);
        const drop = await tx.drop.findFirst({
            where: { id: dropId, ...activeVisibleWhere(now) },
        });
        if (!drop)
            throw new httpError_1.HttpError(404, "Drop not found");
        const activeHold = await tx.reservation.findFirst({
            where: {
                dropId,
                userId: user.id,
                status: client_1.ReservationStatus.ACTIVE,
                expiresAt: { gt: now },
            },
        });
        if (activeHold)
            throw new httpError_1.HttpError(409, "Already reserved");
        const dec = await tx.drop.updateMany({
            where: { id: dropId, availableStock: { gt: 0 } },
            data: { availableStock: { decrement: 1 } },
        });
        if (dec.count === 0)
            throw new httpError_1.HttpError(409, "No stock available");
        const reservation = await tx.reservation.create({
            data: {
                dropId,
                userId: user.id,
                expiresAt,
                status: client_1.ReservationStatus.ACTIVE,
            },
        });
        const next = await tx.drop.findUniqueOrThrow({
            where: { id: dropId },
            select: { availableStock: true },
        });
        return {
            reservationId: reservation.id,
            expiresAt: reservation.expiresAt.toISOString(),
            availableStock: next.availableStock,
        };
    });
}
async function purchaseDropForUsername(dropId, username) {
    const now = new Date();
    return prisma_1.prisma.$transaction(async (tx) => {
        const user = await (0, user_service_1.ensureUserInTransaction)(tx, username);
        const drop = await tx.drop.findFirst({
            where: { id: dropId, ...activeVisibleWhere(now) },
        });
        if (!drop)
            throw new httpError_1.HttpError(404, "Drop not found");
        const reservation = await tx.reservation.findFirst({
            where: {
                dropId,
                userId: user.id,
                status: client_1.ReservationStatus.ACTIVE,
                expiresAt: { gt: now },
            },
        });
        if (!reservation)
            throw new httpError_1.HttpError(409, "No active reservation");
        const purchase = await tx.purchase.create({
            data: { dropId, userId: user.id },
        });
        await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: client_1.ReservationStatus.COMPLETED },
        });
        const next = await tx.drop.findUniqueOrThrow({
            where: { id: dropId },
            select: { availableStock: true },
        });
        return {
            purchaseId: purchase.id,
            purchasedAt: purchase.createdAt.toISOString(),
            availableStock: next.availableStock,
        };
    });
}
