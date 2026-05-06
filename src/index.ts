import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { clientOrigin, httpPort } from "./lib/serverConfig";
import { registerInventorySocket } from "./socket/inventory";

const port = httpPort();
const corsOrigin = clientOrigin();

const io = new Server({
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});
const expressApp = createApp(io);
const httpServer = http.createServer(expressApp);
io.attach(httpServer);

registerInventorySocket(io);

httpServer.listen(port, () => {
  console.log(`API http://localhost:${port}`);
});
