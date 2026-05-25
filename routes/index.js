import express from 'express';
import config from '../config/index.js';
import systemStatus from '../controllers/systemStatus.js';
import { healthCheck, websocketInfo } from '../middleware/index.js';

import User from './user.js';
import strategy from './strategy.js';
import broker from './broker.js';
import trading from './trading.js';
import positions from './positions.js';
import sqoffService from './sqoff-service.js';
import stgTag from './stgTag.js';
import syncStatus from './syncStatus.js';
import orderManagement from './orderManagement.js';
import analytics from './analytics.js';
import service from './service.js';
import marketData from './marketData.js';
import dynamicStg from './dynamicStg.js';
import logs from './logs.js';

const router = express.Router();


router.get('/health', healthCheck);


router.get('/ws', websocketInfo);


router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    version: config.api.version,
    environment: config.server.env,
    timestamp: new Date().toISOString(),
  });
});

router.get('/system-status', systemStatus);

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend Server Up',
    version: config.api.version,
    environment: config.server.env,
    timestamp: new Date().toISOString(),
  });
});

router.get("/check-ip", (req, res) => {
  res.json({
    ip: req.ip,
    forwarded: req.headers["x-forwarded-for"] || null
  });
});

router.use('/admin', User);
router.use('/strategy', strategy);
router.use('/broker', broker);
router.use('/trading', trading);
router.use('/positions', positions);
router.use('/sqoff-service', sqoffService);
router.use('/tag', stgTag);
router.use('/syncStatus', syncStatus);
router.use('/order', orderManagement);
router.use('/analytics', analytics);
router.use('/service', service);
router.use('/market-data', marketData);
router.use('/dynamic-strategy', dynamicStg);
router.use('/logs', logs);

export default router;