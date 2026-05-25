import { Server } from "socket.io";
import { createRoomManager } from "./roomManager.js";
import { initLogForwarding, registerLogHandlers } from "./handlers/logs.js";
import { registerStrategyHandlers } from "./handlers/strategy.js";
import { registerSystemHandlers } from "./handlers/systemStatus.js";
import { registerTagPnLHandlers } from "./handlers/tagPnL.js";

const allowedOrigins = [
  "http://localhost:3000",
  "http://uat.robowriter.in",
  "https://drtrade.robowriter.in",
];

export default function Socket(socketServer) {
  const io = new Server(socketServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const roomManager = createRoomManager(io);
  initLogForwarding(io);

  io.on("connection", (socket) => {
    console.log(socket.id, "Socket Connection Established");

    registerStrategyHandlers(socket, roomManager);
    registerLogHandlers(socket);
    registerSystemHandlers(socket, roomManager);
    registerTagPnLHandlers(socket, roomManager);

    socket.on("disconnecting", () => {
      roomManager.cleanupEmptyRoomIntervals();
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected", socket.id);
      roomManager.cleanupEmptyRoomIntervals();
    });
  });
}
