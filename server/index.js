import express from 'express';
import http from 'http';
import config from '../config/index.js';
import {
  configureCors,
  configureSecurity,
  configureBodyParsing,
  requestLogger,
  errorHandler,
  notFoundHandler
} from '../middleware/index.js';
import routes from '../routes/index.js';
import { initializeCronJobs } from '../jobs/index.js';


export const createApp = () => {
  const app = express();

  app.use(...configureSecurity());
  app.use(configureCors());
  app.use(...configureBodyParsing());
  app.set("trust proxy", "loopback");

  if (config.logging.enableRequestLogging) {
    app.use(requestLogger);
  }

  app.use(config.api.prefix, routes);

  app.use('/', routes);

  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
};


export const createServer = (app) => {
  return http.createServer(app);
};

export const startServer = async (httpServer, port) => {
  return new Promise((resolve, reject) => {
    httpServer.listen(port, (error) => {
      if (error) {
        reject(error);
        return;
      }

      console.log(`
  Server started successfully!
  Server: http://localhost:${port}
  Started at: ${new Date().toLocaleString()}
  Environment: ${config.server.env}
  Version: ${config.api.version}
      `);

      resolve();
    });
  });
};


export const initializeApp = async () => {
  try {
    const app = createApp();

    const httpServer = createServer(app);
    
    initializeCronJobs();

    await startServer(httpServer, config.server.port);

    return { app, httpServer };
  } catch (error) {
    console.error('Failed to initialize application:', error);
    throw error;
  }
};
