export type DropDto = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  totalUnits: number;
  availableStock: number;
  updatedAt: string | null;
  recentPurchasers: {
    username: string;
    purchasedAt: string;
  }[];
};
