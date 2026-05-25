import mongoose from 'mongoose';
import pm2 from 'pm2';
import redisConnect from '../utils/redisConnect.js';

const redis = redisConnect();

function getMongoStatus() {
  const conn = mongoose.connection;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  return {
    stateCode: conn.readyState,
    state: stateMap[conn.readyState] || 'unknown',
    host: conn.host || 'unknown',
    port: conn.port || 'unknown',
    name: conn.name || 'unknown',
  };
}

function getPm2List() {
  return new Promise((resolve) => {
    pm2.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err.message });
        return;
      }
      pm2.list((listErr, list) => {
        if (listErr) {
          resolve({ ok: false, error: listErr.message });
          pm2.disconnect();
          return;
        }
        const processes = list.map((p) => ({
          name: p.name,
          pm_id: p.pm_id,
          status: p.pm2_env?.status,
          restartTime: p.pm2_env?.restart_time,
          uptimeMs: Date.now() - (p.pm2_env?.pm_uptime || Date.now()),
          cpu: p.monit?.cpu,
          memory: p.monit?.memory,
          script: p.pm2_env?.pm_exec_path,
          namespace: p.pm2_env?.namespace,
          nodeVersion: p.pm2_env?.node_version,
        }));
        resolve({ ok: true, processes });
        pm2.disconnect();
      });
    });
  });
}

async function getRedisStatus() {
  try {
    const ping = await redis.ping();

    const authExists = await redis.exists('auth');
    const authType = authExists ? await redis.type('auth') : null;
    const authCount = authExists ? await redis.hlen('auth') : 0;

    const clientsExists = await redis.exists('clients');
    const clientsType = clientsExists ? await redis.type('clients') : null;
    const clientsLen = clientsExists ? await redis.llen('clients') : 0;

    return {
      ok: ping === 'PONG',
      ping,
      keys: {
        auth: {
          exists: authExists === 1,
          type: authType,
          count: authCount,
        },
        clients: {
          exists: clientsExists === 1,
          type: clientsType,
          length: clientsLen,
        },
      },
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export const systemStatus = async (req, res) => {
  try {
    const [pm2Info, redisInfo] = await Promise.all([
      getPm2List(),
      getRedisStatus(),
    ]);

    const mongoInfo = getMongoStatus();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        mongodb: mongoInfo,
        redis: redisInfo,
        pm2: pm2Info,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

export async function getSystemStatusInfo() {
  try {
    const [pm2Info, redisInfo] = await Promise.all([
      getPm2List(),
      getRedisStatus(),
    ]);

    const mongoInfo = getMongoStatus();

    return {
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        mongodb: mongoInfo,
        redis: redisInfo,
        pm2: pm2Info,
      },
    };
  } catch (error) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}

export default systemStatus;


