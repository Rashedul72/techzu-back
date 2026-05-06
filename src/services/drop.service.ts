import { ReservationStatus } from "@prisma/client";
import { HttpError } from "../lib/httpError";
import { prisma } from "../lib/prisma";
import type { DropDto } from "../types/drop.dto";
import { ensureUserInTransaction } from "./user.service";

function activeVisibleWhere(now: Date) {
  return {
    isActive: true,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
  };
}

export async function listActiveDropsDto(): Promise<DropDto[]> {
  const now = new Date();
  const drops = await prisma.drop.findMany({
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
      where: { id: dropId, ...activeVisibleWhere(now) },
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
      data: { availableStock: { decrement: 1 } },
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
