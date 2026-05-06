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
    {
      name: "New Balance 990v6 — Grey",
      description: "Made in USA",
      priceCents: 210_00,
      totalUnits: 80,
      availableStock: 80,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Adidas Samba OG — White",
      description: "Indoor classic",
      priceCents: 100_00,
      totalUnits: 120,
      availableStock: 120,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Asics Gel-Kayano 14 — Silver",
      description: "Y2K runner",
      priceCents: 160_00,
      totalUnits: 60,
      availableStock: 60,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Converse Chuck 70 — Black",
      description: "High top canvas",
      priceCents: 85_00,
      totalUnits: 200,
      availableStock: 200,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Salomon XT-6 — Black",
      description: "Trail utility",
      priceCents: 190_00,
      totalUnits: 40,
      availableStock: 40,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Nike Air Max 1 — Anniversary Red",
      description: "OG colorway",
      priceCents: 140_00,
      totalUnits: 70,
      availableStock: 70,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Puma Suede Classic — Blue",
      description: "Street staple",
      priceCents: 70_00,
      totalUnits: 90,
      availableStock: 90,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Reebok Club C 85 — White",
      description: "Court retro",
      priceCents: 80_00,
      totalUnits: 100,
      availableStock: 100,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Vans Old Skool — Black/White",
      description: "Skate sidewall stripe",
      priceCents: 65_00,
      totalUnits: 150,
      availableStock: 150,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Nike Blazer Mid '77 — Vintage",
      description: "Suede toe",
      priceCents: 100_00,
      totalUnits: 55,
      availableStock: 55,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Jordan 4 — Military Black",
      description: "Retro release",
      priceCents: 210_00,
      totalUnits: 30,
      availableStock: 30,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Adidas Ultraboost 1.0 — Triple Black",
      description: "Boost cushion",
      priceCents: 190_00,
      totalUnits: 45,
      availableStock: 45,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Nike Zoom Vomero 5 — Photon Dust",
      description: "Mesh overlay runner",
      priceCents: 160_00,
      totalUnits: 65,
      availableStock: 65,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Hoka Clifton 9 — Blue",
      description: "Daily trainer",
      priceCents: 145_00,
      totalUnits: 75,
      availableStock: 75,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "On Cloudmonster — White",
      description: "Max cushion road",
      priceCents: 170_00,
      totalUnits: 50,
      availableStock: 50,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Brooks Ghost 15 — Neutral",
      description: "Road running",
      priceCents: 140_00,
      totalUnits: 60,
      availableStock: 60,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      endsAt: null as Date | null,
    },
    {
      name: "Nike Cortez — Forrest Gump",
      description: "White/red/blue",
      priceCents: 90_00,
      totalUnits: 85,
      availableStock: 85,
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
