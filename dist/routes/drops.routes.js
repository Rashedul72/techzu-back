"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createDropsRouter;
const express_1 = require("express");
const drop_service_1 = require("../services/drop.service");
const inventory_1 = require("../socket/inventory");
function createDropsRouter(io) {
    const router = (0, express_1.Router)();
    router.get("/", async (_req, res, next) => {
        try {
            const drops = await (0, drop_service_1.listActiveDropsDto)();
            res.json({ drops });
        }
        catch (e) {
            next(e);
        }
    });
    router.post("/", async (req, res, next) => {
        try {
            const input = (0, drop_service_1.parseCreateMerchDropBody)(req.body);
            const drop = await (0, drop_service_1.createMerchDrop)(input);
            await (0, inventory_1.broadcastInventorySync)(io);
            res.status(201).json({
                message: "Merch drop created successfully. It is live for buyers whenever isActive is true.",
                drop,
            });
        }
        catch (e) {
            next(e);
        }
    });
    router.post("/:dropId/reserve", async (req, res, next) => {
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
            const result = await (0, drop_service_1.reserveDropForUsername)(id, username);
            await (0, inventory_1.broadcastInventorySync)(io);
            res.status(201).json(result);
        }
        catch (e) {
            next(e);
        }
    });
    router.post("/:dropId/purchase", async (req, res, next) => {
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
            const result = await (0, drop_service_1.purchaseDropForUsername)(id, username);
            await (0, inventory_1.broadcastInventorySync)(io);
            res.status(201).json(result);
        }
        catch (e) {
            next(e);
        }
    });
    return router;
}
