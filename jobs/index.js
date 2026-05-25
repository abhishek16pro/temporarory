import cron from 'node-cron';
import config from '../config/index.js';
import initLoginClient from '../login.js';
import Log from '../models/logs.js';
import stgLog from '../models/stgLog.js';
import stg from '../models/strategy.js';
import redisFlushAll from '../utils/redisFlushAll.js';
import rexStgDelete from '../utils/rexStgDelete.js';
import pushClientsToRedis from '../pushClientsToRedis.js';
import SimOrderDetails from '../models/simOrderDetails.js';
import mongoose from 'mongoose';
import saveMtmPositionsJob from './saveMtmPositions.js';
import { updateMarginForAllUsers } from '../controllers/user.js'

const clientLoginJob = () => {
  cron.schedule(config.cron.clientLogin, async () => {
    try {
      console.log(`[CRON] Starting client login job at ${new Date().toISOString()}`);
      await initLoginClient();
      console.log('[CRON] Client login job completed successfully');
    } catch (error) {
      console.error('[CRON] Client login job failed:', error);
    }
  });
};


const stopStrategiesJob = () => {
  cron.schedule(config.cron.stopStrategies, async () => {
    try {
      console.log(`[CRON] Starting stop strategies job at ${new Date().toISOString()}`);

      const allStrategies = await stg.find({}, 'loaded status');

      if (allStrategies.length === 0) {
        console.log('[CRON] No strategies found to stop');
        return;
      }

      await Promise.all(
        allStrategies.map(async (strategy) => {
          await strategy.updateOne({
            loaded: false,
            status: 'Stopped'
          });
        })
      );

      console.log(`[CRON] Successfully stopped ${allStrategies.length} strategies`);
    } catch (error) {
      console.error('[CRON] Stop strategies job failed:', error);
    }
  });
};


const cleanupJob = () => {
  cron.schedule(config.cron.cleanup, async () => {
    try {
      console.log(`[CRON] Starting cleanup job at ${new Date().toISOString()}`);

      await redisFlushAll();
      console.log('[CRON] Redis flushed successfully');

      const logResult = await Log.deleteMany({});
      console.log(`[CRON] Deleted ${logResult.deletedCount} logs`);

      const stgLogResult = await stgLog.deleteMany({});
      console.log(`[CRON] Deleted ${stgLogResult.deletedCount} strategy logs`);

      await rexStgDelete();
      console.log('[CRON] Deleted strategies with name matching "RPT"');

      console.log('[CRON] Cleanup job completed successfully');
    } catch (error) {
      console.error('[CRON] Cleanup job failed:', error);
    }
  });
};

const clientsPushJob = () => {
  cron.schedule(config.cron.pushClients, pushClientsToRedis, {
    timezone: "Asia/Kolkata"
  });
}

const deleteCollectionsJob = () => {
  cron.schedule(config.cron.deleteCollections, async () => {
    try {
      console.log(`[CRON] Starting delete collections job at ${new Date().toISOString()}`);

      const clientPositionResult = await mongoose.connection.db.collection('clientPosition').deleteMany({});
      console.log(`[CRON] Deleted ${clientPositionResult.deletedCount} documents from clientPosition collection`);

      const simOrderDetailsResult = await SimOrderDetails.deleteMany({});
      console.log(`[CRON] Deleted ${simOrderDetailsResult.deletedCount} documents from simOrderDetails collection`);

      console.log('[CRON] Delete collections job completed successfully');
    } catch (error) {
      console.error('[CRON] Delete collections job failed:', error);
    }
  });
}

const udpateMarginDetailsJob = () => {
  cron.schedule(config.cron.updateMarginDetails, async () => {
    try {
      // console.log(`[CRON] Starting update margin details job at ${new Date().toISOString()}`);
      await updateMarginForAllUsers();
      // console.log('[CRON] Update margin details job completed successfully');
    } catch (error) {
      console.error('[CRON] Update margin details job failed:', error);
    }
  });
}

export const initializeCronJobs = () => {
  console.log('[CRON] Initializing cron jobs...');

  clientLoginJob();
  stopStrategiesJob();
  cleanupJob();
  clientsPushJob();
  deleteCollectionsJob();
  saveMtmPositionsJob();
  udpateMarginDetailsJob()

  console.log('[CRON] All cron jobs initialized successfully');
};


export const getCronStatus = () => {
  return {
    jobs: [
      {
        name: 'Client Login',
        schedule: config.cron.clientLogin,
        description: 'Runs daily at 8:45 AM',
      },
      {
        name: 'Stop Strategies',
        schedule: config.cron.stopStrategies,
        description: 'Runs daily at 11:56 PM',
      },
      {
        name: 'Cleanup',
        schedule: config.cron.cleanup,
        description: 'Runs daily at 11:59 PM',
      },
      {
        name: 'Push Clients',
        schedule: config.cron.pushClients,
        description: 'Runs daily at 08:45 AM',
      },
      {
        name: 'Delete Collections',
        schedule: config.cron.deleteCollections,
        description: 'Runs daily at 11:59 PM - Deletes clientPosition and simOrderDetails collections',
      },
      {
        name: 'Save MTM Positions',
        schedule: config.cron.saveMtmPositions,
        description: 'Runs daily at 3:31 PM - Saves all client positions MTM for analysis',
      },
      {
        name: 'Update Margin Details',
        schedule: config.cron.updateMarginDetails,
        description: 'Runs every minute - Updates margin details for all users',
      }
    ],
    status: 'active',
    timestamp: new Date().toISOString(),
  };
};
