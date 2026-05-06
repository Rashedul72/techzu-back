"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const httpError_1 = require("./lib/httpError");
const serverConfig_1 = require("./lib/serverConfig");
const drops_routes_1 = __importDefault(require("./routes/drops.routes"));
const reservationExpiry_service_1 = require("./services/reservationExpiry.service");
const inventory_1 = require("./socket/inventory");
function createApp(io) {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: (0, serverConfig_1.clientOrigin)(),
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use("/api/drops", (0, drops_routes_1.default)(io));
    app.get("/api/cron/expire-reservations", async (req, res, next) => {
        try {
            const secret = process.env.CRON_SECRET;
            if (!secret ||
                req.headers.authorization !== `Bearer ${secret}`) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            await (0, reservationExpiry_service_1.sweepExpiredReservations)(null);
            res.status(200).json({ ok: true });
        }
        catch (e) {
            next(e);
        }
    });
    if (process.env.NODE_ENV !== "production") {
        app.post("/api/dev/broadcast-inventory", async (_req, res, next) => {
            try {
                await (0, inventory_1.broadcastInventorySync)(io);
                res.json({ ok: true });
            }
            catch (e) {
                next(e);
            }
        });
    }
    app.use((err, _req, res, _next) => {
        if (err instanceof httpError_1.HttpError) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    });
    return app;
}
