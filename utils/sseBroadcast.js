import { broadcastSyncStatusUpdate } from '../controllers/syncStatus.js';


export const triggerSyncStatusBroadcast = async (clientId = null) => {
  try {
    await broadcastSyncStatusUpdate(clientId);
    console.log(` Sync status broadcast triggered${clientId ? ` for client: ${clientId}` : ' for all clients'}`);
  } catch (error) {
    console.error('Error triggering sync status broadcast:', error);
  }
};

export const onSyncStatusChange = async (clientId = null) => {
  await triggerSyncStatusBroadcast(clientId);
};

export default {
  triggerSyncStatusBroadcast,
  onSyncStatusChange
};
