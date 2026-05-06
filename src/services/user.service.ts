import type { Prisma } from "@prisma/client";
import { HttpError } from "../lib/httpError";

export async function ensureUserInTransaction(
  tx: Prisma.TransactionClient,
  rawUsername: string,
) {
  const username = rawUsername.trim().slice(0, 64);
  if (!username) throw new HttpError(400, "Invalid username");
  return tx.user.upsert({
    where: { username },
    create: { username },
    update: {},
  });
}
