import mongoose from "mongoose";
import SyncStatus from "../models/syncStatus.js";
import ApiResponse from "../../shared/utils/apiResponse.js";

const sseConnections = new Map();
let intervalId = null;

export const getSyncStatus = async (req, res) => {
  try {
    const { clientId } = req.query;

    const query = clientId ? { clientId } : {};
    const syncStatusUpdatedData = await SyncStatus.find(
      query,
      { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
    ).lean();

    return res.status(200).send(
      new ApiResponse({
        success: true,
        statusCode: 200,
        message: "Sync Status Updated",
        data: syncStatusUpdatedData,
      }).toObject()
    );
  } catch (error) {
    console.error("❌ API /sync-status error:", error);
    return res.status(500).send(
      new ApiResponse({
        success: false,
        statusCode: 500,
        message: error.message,
      }).toObject()
    );
  }
};

export const getSyncStatusSSE = async (req, res) => {
  try {
    const { clientId } = req.query;
    const connectionId = `RW-COPYTRADE-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    res.write(
      `data: ${JSON.stringify({
        type: "connection",
        message: "SSE connection established",
        connectionId,
      })}\n\n`
    );

    sseConnections.set(connectionId, {
      res,
      clientId,
      timestamp: Date.now(),
    });


    try {
      const query = clientId ? { clientId } : {};
      const syncStatusData = await SyncStatus.find(query).lean();

      res.write(
        `data: ${JSON.stringify({
          type: "syncStatus",
          data: syncStatusData,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
    } catch (error) {
      console.error(" Error sending initial sync status:", error);
    }

    if (!intervalId) {
      startPeriodicUpdates();
    }

    req.on("close", () => {
      console.log(`SSE connection closed: ${connectionId}`);
      sseConnections.delete(connectionId);

      if (sseConnections.size === 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });

    req.on("error", (error) => {
      console.error(`SSE connection error for ${connectionId}:`, error);
      sseConnections.delete(connectionId);
    });
  } catch (error) {
    console.error("SSE /sync-status-stream error:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: error.message,
      })}\n\n`
    );
    res.end();
  }
};

export const broadcastSyncStatusUpdate = async (clientId = null) => {
  try {
    const query = clientId ? { clientId } : {};
    const syncStatusData = await SyncStatus.find(query).lean();

    const message = {
      type: "syncStatus",
      data: syncStatusData,
      timestamp: new Date().toISOString(),
    };

    for (const [connectionId, connection] of sseConnections.entries()) {
      try {
        if (
          clientId &&
          connection.clientId &&
          connection.clientId !== clientId
        ) {
          continue;
        }

        connection.res.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        console.error(`Error sending to connection ${connectionId}:`, error);
        sseConnections.delete(connectionId);
      }
    }

  } catch (error) {
    console.error("Error broadcasting sync status update:", error);
  }
};

export const triggerBroadcast = async (req, res) => {
  try {
    const { clientId } = req.body;
    await broadcastSyncStatusUpdate(clientId);

    return res.status(200).send(
      new ApiResponse({
        success: true,
        statusCode: 200,
        message: "Broadcast triggered successfully",
        data: {
          activeConnections: sseConnections.size,
          clientId: clientId || "all",
        },
      }).toObject()
    );
  } catch (error) {
    console.error("❌ Error triggering broadcast:", error);
    return res.status(500).send(
      new ApiResponse({
        success: false,
        statusCode: 500,
        message: error.message,
      }).toObject()
    );
  }
};

const startPeriodicUpdates = () => {
  if (intervalId) {
    return;
  }

  intervalId = setInterval(async () => {
    if (sseConnections.size > 0) {
      try {
        const syncStatusData = await SyncStatus.find({}).lean();

        const message = {
          type: "syncStatus",
          data: syncStatusData,
          timestamp: new Date().toISOString(),
          source: "periodic",
        };

        for (const [connectionId, connection] of sseConnections.entries()) {
          try {
            connection.res.write(`data: ${JSON.stringify(message)}\n\n`);
          } catch (error) {
            console.error(
              `Error sending periodic update to connection ${connectionId}:`,
              error
            );
            sseConnections.delete(connectionId);
          }
        }

      } catch (error) {
        console.error("Error in periodic update:", error);
      }
    }
  }, 10000); // 10 seconds
};

export const getActiveConnectionsCount = () => {
  return {
    activeConnections: sseConnections.size,
    connections: Array.from(sseConnections.entries()).map(([id, conn]) => {
      let headersText = "";
      try {
        if (conn.res && typeof conn.res.getHeaders === "function") {
          const headers = conn.res.getHeaders();
          headersText = Object.entries(headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\r\n");
        }
      } catch (err) {
        headersText = "N/A";
      }

      return {
        id,
        clientId: conn.clientId ?? null,
        timestamp: conn.timestamp,
        headers: headersText,
      };
    }),
  };
};
