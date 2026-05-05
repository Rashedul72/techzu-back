import { Router, type Request, type Response, type NextFunction } from "express";
import { listActiveDropsDto } from "../services/drop.service";

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

export default router;
