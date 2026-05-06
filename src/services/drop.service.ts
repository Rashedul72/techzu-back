import { Prisma, ReservationStatus } from "@prisma/client";
import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";
import type { DropDto } from "../types/drop.dto";
import { ensureUserInTransaction } from "./user.service";

const PURCHASE_FEED_LIMIT = 3;

function toDropDto(
  d: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    totalUnits: number;
    availableStock: number;
    updatedAt: Date | null;
    purchases: {
      createdAt: Date;
      user: { username: string };
    }[];
  },
): DropDto {
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

export async function listActiveDropsDto(): Promise<DropDto[]> {
  const drops = await prisma.drop.findMany({
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

export type CreateMerchDropInput = {
  name: string;
  description: string | null;
  priceCents: number;
  totalUnits: number;
  isActive: boolean;
};

function readNonEmptyString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new HttpError(400, `${field} required`);
  }
  return v.trim().slice(0, 256);
}

function readInt(v: unknown, field: string): number {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isInteger(Number(v))) {
    return Number(v);
  }
  throw new HttpError(400, `${field} must be an integer`);
}

export function parseCreateMerchDropBody(body: unknown): CreateMerchDropInput {
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid JSON body");
  const b = body as Record<string, unknown>;
  const name = readNonEmptyString(b.name, "name");
  let description: string | null = null;
  if (b.description !== null && b.description !== undefined) {
    if (typeof b.description !== "string") throw new HttpError(400, "description must be a string");
    description = b.description.slice(0, 2000) || null;
  }
  const priceCents = readInt(b.priceCents, "priceCents");
  const totalUnits = readInt(b.totalUnits, "totalUnits");
  if (priceCents < 0) throw new HttpError(400, "priceCents must be >= 0");
  if (totalUnits < 1) throw new HttpError(400, "totalUnits must be >= 1");
  let isActive = true;
  if (b.isActive !== null && b.isActive !== undefined) {
    if (typeof b.isActive !== "boolean") throw new HttpError(400, "isActive must be boolean");
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

export async function createMerchDrop(input: CreateMerchDropInput): Promise<DropDto> {
  const d = await prisma.drop.create({
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

export type ReserveDropSuccess = {
  reservationId: string;
  expiresAt: string;
  availableStock: number;
};

export async function reserveDropForUsername(
  dropId: string,
  username: string,
): Promise<ReserveDropSuccess> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60_000);

  return prisma.$transaction(async (tx) => {
    const user = await ensureUserInTransaction(tx, username);

    const drop = await tx.drop.findFirst({
      where: { id: dropId, ...activeVisibleWhere() },
    });
    if (!drop) throw new HttpError(404, "Drop not found");

    const activeHold = await tx.reservation.findFirst({
      where: {
        dropId,
        userId: user.id,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });
    if (activeHold) throw new HttpError(409, "Already reserved");

    const dec = await tx.drop.updateMany({
      where: { id: dropId, availableStock: { gt: 0 } },
      data: {
        availableStock: { decrement: 1 },
        updatedAt: now,
      },
    });
    if (dec.count === 0) throw new HttpError(409, "No stock available");

    const reservation = await tx.reservation.create({
      data: {
        dropId,
        userId: user.id,
        expiresAt,
        status: ReservationStatus.ACTIVE,
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

export type PurchaseDropSuccess = {
  purchaseId: string;
  purchasedAt: string;
  availableStock: number;
  updatedAt: string;
};

export async function purchaseDropForUsername(
  dropId: string,
  username: string,
): Promise<PurchaseDropSuccess> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const user = await ensureUserInTransaction(tx, username);

    const drop = await tx.drop.findFirst({
      where: { id: dropId, ...activeVisibleWhere() },
    });
    if (!drop) throw new HttpError(404, "Drop not found");

    const reservation = await tx.reservation.findFirst({
      where: {
        dropId,
        userId: user.id,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });
    if (!reservation) throw new HttpError(409, "No active reservation");

    const purchase = await tx.purchase.create({
      data: { dropId, userId: user.id },
    });

    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.COMPLETED },
    });

    const purchasedAtTs = new Date();
    await tx.$executeRaw(
      Prisma.sql`UPDATE "drops" SET "updatedAt" = ${purchasedAtTs} WHERE "id" = ${dropId}`,
    );

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
