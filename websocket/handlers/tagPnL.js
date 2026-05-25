import { getLiveLogsByTag } from "../fetchers/liveLogsByTag.js";
import { getAccountWiseTagPnL } from "../fetchers/accountWiseTagPnL.js";

export function registerTagPnLHandlers(socket, roomManager) {
  socket.on("subscribeTagPnL", async ({ tag }) => {
    if (!tag) return;
    const roomName = `tagPnL:${tag}`;
    socket.join(roomName);

    roomManager.schedule(roomName, 1000, () => getLiveLogsByTag(tag), "tagPnLUpdate");

    if (!roomManager.emitCachedTo(socket, roomName, "tagPnLUpdate")) {
      try {
        socket.emit("tagPnLUpdate", await getLiveLogsByTag(tag));
      } catch (error) {
        console.error("Failed to emit initial tag PnL:", error.message);
      }
    }

    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("subscribeAccountWiseTagPnL", async ({ tag }) => {
    if (!tag) return;
    const roomName = `accountWiseTagPnL:${tag}`;
    socket.join(roomName);

    roomManager.schedule(roomName, 2000, () => getAccountWiseTagPnL(tag), "accountWiseTagPnLUpdate");

    if (!roomManager.emitCachedTo(socket, roomName, "accountWiseTagPnLUpdate")) {
      try {
        socket.emit("accountWiseTagPnLUpdate", await getAccountWiseTagPnL(tag));
      } catch (error) {
        console.error("Failed to emit initial account-wise tag PnL:", error.message);
      }
    }

    roomManager.cleanupEmptyRoomIntervals();
  });
}
