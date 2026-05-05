import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import type { Server as IoServer } from "socket.io";
import { clientOrigin } from "./lib/serverConfig";
import dropsRouter from "./routes/drops.routes";
import { broadcastInventorySync } from "./socket/inventory";

export function createApp(io: IoServer): express.Express {
  const app = express();

  app.use(
    cors({
      origin: clientOrigin(),
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use("/api/drops", dropsRouter);

  if (process.env.NODE_ENV !== "production") {
    app.post(
      "/api/dev/broadcast-inventory",
      async (_req: Request, res: Response, next: NextFunction) => {
        try {
          await broadcastInventorySync(io);
          res.json({ ok: true });
        } catch (e) {
          next(e);
        }
      },
    );
  }

  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ): void => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    },
  );

  return app;
}
