"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActiveDropsDto = listActiveDropsDto;
exports.parseCreateMerchDropBody = parseCreateMerchDropBody;
exports.createMerchDrop = createMerchDrop;
exports.reserveDropForUsername = reserveDropForUsername;
exports.purchaseDropForUsername = purchaseDropForUsername;
const client_1 = require("@prisma/client");
const httpError_1 = require("../lib/httpError");
const prisma_1 = require("../lib/prisma");
const user_service_1 = require("./user.service");
const PURCHASE_FEED_LIMIT = 3;
function toDropDto(d) {
    return {
        id: d.id,
        name: d.name,
        description: d.description,
        priceCents: d.priceCents,
        totalUnits: d.totalUnits,
        availableStock: d.availableStock,
        updatedAt: d.updatedAt?.toISOString() ?? null,
        recentPurchasers: d.purchases.map((p) => ({
            username: p.user.username,
            purchasedAt: p.createdAt.toISOString(),
        })),
    };
}
function activeVisibleWhere() {
    return { isActive: true };
}
async function listActiveDropsDto() {
    const drops = await prisma_1.prisma.drop.findMany({
        where: activeVisibleWhere(),
        orderBy: { createdAt: "asc" },
        include: {
            purchases: {
                orderBy: { createdAt: "desc" },
                take: PURCHASE_FEED_LIMIT,
                include: {
                    user: { select: { username: true } },
                },
            },
        },
    });
    return drops.map((d) => toDropDto(d));
}
function readNonEmptyString(v, field) {
    if (typeof v !== "string" || !v.trim()) {
        throw new httpError_1.HttpError(400, `${field} required`);
    }
    return v.trim().slice(0, 256);
}
function readInt(v, field) {
    if (typeof v === "number" && Number.isInteger(v))
        return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isInteger(Number(v))) {
        return Number(v);
    }
    throw new httpError_1.HttpError(400, `${field} must be an integer`);
}
function parseCreateMerchDropBody(body) {
    if (!body || typeof body !== "object")
        throw new httpError_1.HttpError(400, "Invalid JSON body");
    const b = body;
    const name = readNonEmptyString(b.name, "name");
    let description = null;
    if (b.description !== null && b.description !== undefined) {
        if (typeof b.description !== "string")
            throw new httpError_1.HttpError(400, "description must be a string");
        description = b.description.slice(0, 2000) || null;
    }
    const priceCents = readInt(b.priceCents, "priceCents");
    const totalUnits = readInt(b.totalUnits, "totalUnits");
    if (priceCents < 0)
        throw new httpError_1.HttpError(400, "priceCents must be >= 0");
    if (totalUnits < 1)
        throw new httpError_1.HttpError(400, "totalUnits must be >= 1");
    let isActive = true;
    if (b.isActive !== null && b.isActive !== undefined) {
        if (typeof b.isActive !== "boolean")
            throw new httpError_1.HttpError(400, "isActive must be boolean");
        isActive = b.isActive;
    }
    return {
        name,
        description,
        priceCents,
        totalUnits,
        isActive,
    };
}
async function createMerchDrop(input) {
    const d = await prisma_1.prisma.drop.create({
        data: {
            name: input.name,
            description: input.description,
            priceCents: input.priceCents,
            totalUnits: input.totalUnits,
            availableStock: input.totalUnits,
            isActive: input.isActive,
            updatedAt: null,
        },
        include: {
            purchases: {
                orderBy: { createdAt: "desc" },
                take: PURCHASE_FEED_LIMIT,
                include: { user: { select: { username: true } } },
            },
        },
    });
    return toDropDto(d);
}
async function reserveDropForUsername(dropId, username) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60_000);
    return prisma_1.prisma.$transaction(async (tx) => {
        const user = await (0, user_service_1.ensureUserInTransaction)(tx, username);
        const drop = await tx.drop.findFirst({
            where: { id: dropId, ...activeVisibleWhere() },
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
            data: {
                availableStock: { decrement: 1 },
                updatedAt: now,
            },
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
            where: { id: dropId, ...activeVisibleWhere() },
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
        const purchasedAtTs = new Date();
        await tx.$executeRaw(client_1.Prisma.sql `UPDATE "drops" SET "updatedAt" = ${purchasedAtTs} WHERE "id" = ${dropId}`);
        const next = await tx.drop.findUniqueOrThrow({
            where: { id: dropId },
            select: { availableStock: true, updatedAt: true },
        });
        return {
            purchaseId: purchase.id,
            purchasedAt: purchase.createdAt.toISOString(),
            availableStock: next.availableStock,
            updatedAt: next.updatedAt?.toISOString() ?? purchasedAtTs.toISOString(),
        };
    });
}
