import { REDIS_CHANNELS } from "../../../shared/constants/redisConstant.js";
import { subscribe as redisSubscribe } from "../../../shared/utils/redisPubSub.js";

export function initLogForwarding(io) {
  redisSubscribe(REDIS_CHANNELS.LOGS, (parsedMessage) => {
    try {
      io.to("logs").emit("getLog", parsedMessage);
    } catch (error) {
      console.error("Error emitting log to sockets:", error);
    }
  }).catch((error) => {
    console.error("Failed to subscribe to Redis logs channel:", error);
  });
}

export function registerLogHandlers(socket) {
  socket.on("subscribeLogs", () => {
    const roomName = "logs";
    socket.join(roomName);
    try {
      socket.emit("subscribedLogs", { success: true });
    } catch (error) {
      console.error("Failed to emit subscribedLogs:", error);
    }
  });
}
