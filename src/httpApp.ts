import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import type { Server as IoServer } from "socket.io";
import { HttpError } from "./lib/httpError";
import { clientOrigin } from "./lib/serverConfig";
import createDropsRouter from "./routes/drops.routes";
import { broadcastInventorySync } from "./socket/inventory";

export function createApp(io: IoServer | null): express.Express {
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

  app.use("/api/drops", createDropsRouter(io));

  if (process.env.NODE_ENV !== "production") {
    app.post(
      "/api/dev/broadcast-inventory",
      async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
      if (err instanceof HttpError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    },
  );

  return app;
}
