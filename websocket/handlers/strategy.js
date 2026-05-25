import { getLiveStgLogs } from "../fetchers/liveStgLogs.js";
import { fetchStgData } from "../fetchers/stgStatusData.js";

export function registerStrategyHandlers(socket, roomManager) {
  socket.on("subscribeStg", async ({ stgName }) => {
    if (!stgName) return;
    const roomName = `stg:${stgName}`;
    socket.join(roomName);

    roomManager.schedule(roomName, 1000, () => getLiveStgLogs(stgName), "getStgLog");

    if (!roomManager.emitCachedTo(socket, roomName, "getStgLog")) {
      try {
        socket.emit("getStgLog", await getLiveStgLogs(stgName));
      } catch (error) {
        console.error("Failed to emit initial strategy log:", error.message);
      }
    }

    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("unsubscribeStg", ({ stgName }) => {
    if (!stgName) return;
    const roomName = `stg:${stgName}`;
    socket.leave(roomName);
    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("stgStatus", (runOnDay) => {
    const rooms = Array.from(socket.rooms);
    const stgStatusRooms = rooms.filter((room) => room.startsWith("stgStatus:"));
    stgStatusRooms.forEach((room) => socket.leave(room));

    const key = Array.isArray(runOnDay)
      ? JSON.stringify(runOnDay)
      : String(runOnDay ?? "all");
    const roomName = `stgStatus:${key}`;

    socket.join(roomName);
    roomManager.schedule(roomName, 1000, () => fetchStgData(runOnDay), "getStgData");

    if (!roomManager.emitCachedTo(socket, roomName, "getStgData")) {
      (async () => {
        try {
          socket.emit("getStgData", await fetchStgData(runOnDay));
        } catch (error) {
          console.error("Failed to emit initial stg status:", error.message);
        }
      })();
    }

    roomManager.cleanupEmptyRoomIntervals();
  });
}
