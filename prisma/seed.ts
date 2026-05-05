import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.purchase.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.drop.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const sample = [
    {
      name: "Air Jordan 1 — Chicago",
      description: "Retro high OG",
      priceCents: 180_00,
      totalUnits: 100,
      availableStock: 100,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Nike Dunk Low — Panda",
      description: "Classic two-tone",
      priceCents: 110_00,
      totalUnits: 50,
      availableStock: 50,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Yeezy 350 — Zebra",
      description: "Limited restock",
      priceCents: 220_00,
      totalUnits: 5,
      availableStock: 5,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
  ];

  for (const s of sample) {
    await prisma.drop.create({
      data: {
        ...s,
        isActive: true,
      },
    });
  }

  console.log("Seeded", sample.length, "drops");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
