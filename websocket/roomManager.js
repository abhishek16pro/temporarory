export function createRoomManager(io) {
  const topicIntervals = new Map();
  const lastPayloadByRoom = new Map();

  function cleanupEmptyRoomIntervals() {
    for (const [roomName, state] of topicIntervals.entries()) {
      const room = io.sockets.adapter.rooms.get(roomName);
      if (!room || room.size === 0) {
        clearInterval(state.interval);
        topicIntervals.delete(roomName);
        lastPayloadByRoom.delete(roomName);
      }
    }
  }

  function schedule(roomName, intervalMs, fetchFn, eventName) {
    if (topicIntervals.has(roomName)) return;

    const state = {
      interval: null,
      running: false,
    };

    const runner = async () => {
      if (state.running) return;
      state.running = true;
      try {
        const data = await fetchFn();
        try {
          const next = JSON.stringify(data);
          const prev = lastPayloadByRoom.get(roomName);
          if (next !== prev) {
            io.to(roomName).emit(eventName, data);
            lastPayloadByRoom.set(roomName, next);
          }
        } catch {
          io.to(roomName).emit(eventName, data);
        }
      } catch (error) {
        console.error(`WebSocket room "${roomName}" fetch error:`, error.message || error);
      } finally {
        state.running = false;
      }
    };

    state.interval = setInterval(runner, intervalMs);
    topicIntervals.set(roomName, state);
  }

  return {
    schedule,
    cleanupEmptyRoomIntervals,
  };
}
