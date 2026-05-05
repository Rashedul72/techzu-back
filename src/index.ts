import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { clientOrigin, httpPort } from "./lib/serverConfig";
import { registerInventorySocket } from "./socket/inventory";

const port = httpPort();
const corsOrigin = clientOrigin();

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const app = createApp(io);
httpServer.on("request", app);

registerInventorySocket(io);

httpServer.listen(port, () => {
  console.log(`API http://localhost:${port}`);
});
