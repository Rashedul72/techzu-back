import { prisma } from "../lib/prisma";
import type { DropDto } from "../types/drop.dto";

export async function listActiveDropsDto(): Promise<DropDto[]> {
  const now = new Date();
  const drops = await prisma.drop.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
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
