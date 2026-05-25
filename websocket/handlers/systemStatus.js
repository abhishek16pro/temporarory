import { getClientPositions } from "../../controllers/positions.js";
import getStraddle from "../../controllers/straddle.js";
import { getSystemStatusInfo } from "../../controllers/systemStatus.js";

export function registerSystemHandlers(socket, roomManager) {
  socket.on("getPositions", async () => {
    const roomName = "positions";
    socket.join(roomName);

    roomManager.schedule(roomName, 10000, () => getClientPositions(), "positions");

    if (!roomManager.emitCachedTo(socket, roomName, "positions")) {
      try {
        socket.emit("positions", await getClientPositions());
      } catch (error) {
        console.error("Failed to emit initial positions:", error.message);
      }
    }

    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("getStraddle", async () => {
    try {
      const straddleResults = await getStraddle();
      socket.emit("straddleData", straddleResults);
    } catch (error) {
      console.error("Error fetching straddle data:", error);
      socket.emit("straddleData", { error: error.message });
    }
  });

  socket.on("subscribeSystemStatus", async () => {
    const roomName = "systemStatus";
    socket.join(roomName);

    roomManager.schedule(roomName, 120000, () => getSystemStatusInfo(), "systemStatusUpdate");

    if (!roomManager.emitCachedTo(socket, roomName, "systemStatusUpdate")) {
      try {
        socket.emit("systemStatusUpdate", await getSystemStatusInfo());
      } catch (error) {
        console.error("Failed to emit initial system status:", error.message);
      }
    }

    roomManager.cleanupEmptyRoomIntervals();
  });
}
