import { Router, type Request, type Response, type NextFunction } from "express";
import type { Server as IoServer } from "socket.io";
import {
  listActiveDropsDto,
  purchaseDropForUsername,
  reserveDropForUsername,
} from "../services/drop.service";
import { broadcastInventorySync } from "../socket/inventory";

export default function createDropsRouter(io: IoServer): Router {
  const router = Router();

  router.get(
    "/",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const drops = await listActiveDropsDto();
        res.json({ drops });
      } catch (e) {
        next(e);
      }
    },
  );

  router.post(
    "/:dropId/reserve",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const username = req.body?.username;
        if (typeof username !== "string" || !username.trim()) {
          res.status(400).json({ error: "username required" });
          return;
        }
        const dropId = req.params.dropId;
        const id = Array.isArray(dropId) ? dropId[0] : dropId;
        if (!id) {
          res.status(400).json({ error: "dropId required" });
          return;
        }
        const result = await reserveDropForUsername(id, username);
        await broadcastInventorySync(io);
        res.status(201).json(result);
      } catch (e) {
        next(e);
      }
    },
  );

  router.post(
    "/:dropId/purchase",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const username = req.body?.username;
        if (typeof username !== "string" || !username.trim()) {
          res.status(400).json({ error: "username required" });
          return;
        }
        const dropId = req.params.dropId;
        const id = Array.isArray(dropId) ? dropId[0] : dropId;
        if (!id) {
          res.status(400).json({ error: "dropId required" });
          return;
        }
        const result = await purchaseDropForUsername(id, username);
        await broadcastInventorySync(io);
        res.status(201).json(result);
      } catch (e) {
        next(e);
      }
    },
  );

  return router;
}
