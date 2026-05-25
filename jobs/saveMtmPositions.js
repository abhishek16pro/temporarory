import cron from 'node-cron';
import positionMtm from '../models/positionMtm.js';
import { getClientPositions } from '../controllers/positions.js';
import config from '../config/index.js';

const saveMtmPositionsJob = () => {
  cron.schedule(config.cron.saveMtmPositions, async () => {
    try {
      console.log(`[CRON] Starting MTM positions save job at ${new Date().toISOString()}`);
      
      const clientPositions = await getClientPositions();
      
      if (!clientPositions || clientPositions.length === 0) {
        console.log('[CRON] No client positions found to save');
        return;
      }
      
      const savePromises = clientPositions.map(clientPosition => {
        const mtmData = {
          clientId: clientPosition.clientId,
          mtm: clientPosition.mtm,
          positions: clientPosition.positions,
          totalBuyQuantity: clientPosition.totalBuyQuantity,
          totalSellQuantity: clientPosition.totalSellQuantity,
          netQuantity: clientPosition.netQuantity,
          date: new Date()
        };
        
        const newPositionMtm = new positionMtm(mtmData);
        return newPositionMtm.save();
      });
      
      await Promise.all(savePromises);
      
      console.log(`[CRON] Successfully saved MTM positions for ${clientPositions.length} clients`);
    } catch (error) {
      console.error('[CRON] MTM positions save job failed:', error);
    }
  });
};

export default saveMtmPositionsJob;