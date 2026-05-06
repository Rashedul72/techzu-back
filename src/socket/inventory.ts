import type { Server, Socket } from "socket.io";
import type { DropDto } from "../types/drop.dto";
import { listActiveDropsDto } from "../services/drop.service";

const ROOM = "inventory";

async function syncPayload(): Promise<{ drops: DropDto[] }> {
  const drops = await listActiveDropsDto();
  return { drops };
}

export function registerInventorySocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    void (async () => {
      socket.join(ROOM);
      try {
        socket.emit("inventory:sync", await syncPayload());
      } catch (err) {
        console.error("[socket] inventory:sync failed", err);
        socket.emit("inventory:error", { message: "Failed to load inventory" });
      }
    })();
  });
}

export async function broadcastInventorySync(io: Server | null): Promise<void> {
  if (!io) return;
  io.to(ROOM).emit("inventory:sync", await syncPayload());
}

export function broadcastStockUpdates(
  io: Server | null,
  updates: { dropId: string; availableStock: number }[],
): void {
  if (!io) return;
  for (const u of updates) {
    io.to(ROOM).emit("stock:update", u);
  }
}

export function broadcastReservationExpired(
  io: Server | null,
  items: { dropId: string; username: string }[],
): void {
  if (!io || items.length === 0) return;
  io.to(ROOM).emit("reservation:expired", { items });
}
