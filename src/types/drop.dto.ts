export type DropDto = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalUnits: number;
  availableStock: number;
  startsAt: string;
  endsAt: string | null;
  recentPurchasers: {
    username: string;
    purchasedAt: string;
  }[];
};
