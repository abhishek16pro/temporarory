import dotenv from 'dotenv';

dotenv.config();

const detectEnvironment = () => {
  const hasDevFlag = process.argv.includes('--dev');
  const nodeEnv = process.env.NODE_ENV;
  
  if (hasDevFlag) {
    return { isDev: true, env: 'development' };
  }
  
  if (nodeEnv === 'development') {
    return { isDev: true, env: 'development' };
  }
  
  if (nodeEnv === 'production') {
    return { isDev: false, env: 'production' };
  }
  
  return { isDev: false, env: 'production' };
};

const { isDev, env: environment } = detectEnvironment();

const config = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    env: environment,
    isDev: isDev,
  },

  websocket: {
    port: process.env.WEBSOCKET_PORT || 3002,
  },

  cors: {
    origins: [
      "http://localhost:3000",
      "http://uat.robowriter.in",
      "https://drtrade.robowriter.in",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  database: {
    mongoUri: isDev 
      ? (process.env.MONGO_URI || 'mongodb://localhost:27017/XTS')
      : (process.env.MONGO_URI || 'mongodb://3.109.147.195:27017/XTS'),
    isDev: isDev,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  cron: {
    clientLogin: '0 45 8 * * *', // 8:45 AM daily
    stopStrategies: '0 56 23 * * *', // 11:56 PM daily
    cleanup: '0 59 23 * * *', // 11:59 PM daily
    pushClients: '30 8 * * *', // 8:30 AM daily
    deleteCollections: '0 59 23 * * *', // 11:59 PM daily
    saveMtmPositions: '0 31 15 * * *', // 3:31 PM daily
    updateMarginDetails: '* 9-15 * * 1-5' // Every minute during market hours (9 AM to 3 PM, Monday to Friday)
  },

  api: {
    prefix: '/api/v1',
    version: '1.0.0',
  },

  security: {
    helmet: {
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    },
  },

  logging: {
    level: isDev ? (process.env.LOG_LEVEL || 'debug') : (process.env.LOG_LEVEL || 'info'),
    format: isDev ? (process.env.LOG_FORMAT || 'dev') : (process.env.LOG_FORMAT || 'combined'),
    enableRequestLogging: isDev,
    enableDetailedErrors: isDev,
  },
};

export const isDevelopment = () => config.server.isDev;
export const isProduction = () => !config.server.isDev;
export const getEnvironment = () => config.server.env;

export default config;
