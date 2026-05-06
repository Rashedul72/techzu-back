import { ReservationStatus } from "@prisma/client";
import type { Server } from "socket.io";
import { prisma } from "../lib/prisma";
import {
  broadcastInventorySync,
  broadcastReservationExpired,
  broadcastStockUpdates,
} from "../socket/inventory";

const SWEEP_MS = 2000;

export async function sweepExpiredReservations(io: Server | null): Promise<void> {
  const now = new Date();
  const outcome = await prisma.$transaction(async (tx) => {
    const rows = await tx.reservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        dropId: true,
        user: { select: { username: true } },
      },
    });
    if (rows.length === 0) {
      return { expired: [] as { dropId: string; username: string }[], stocks: [] as { dropId: string; availableStock: number }[] };
    }

    const byDrop = new Map<string, string[]>();
    const expired: { dropId: string; username: string }[] = [];
    for (const r of rows) {
      expired.push({ dropId: r.dropId, username: r.user.username });
      const ids = byDrop.get(r.dropId) ?? [];
      ids.push(r.id);
      byDrop.set(r.dropId, ids);
    }

    await tx.reservation.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status: ReservationStatus.EXPIRED },
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

  if (outcome.expired.length === 0) return;

  broadcastStockUpdates(io, outcome.stocks);
  broadcastReservationExpired(io, outcome.expired);
  await broadcastInventorySync(io);
}

export function startReservationExpiryLoop(io: Server): () => void {
  const id = setInterval(() => {
    void sweepExpiredReservations(io).catch((err) => {
      console.error("[expiry]", err);
    });
  }, SWEEP_MS);
  return () => clearInterval(id);
}
