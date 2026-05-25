
import connectDB from './utils/connectMongo.js';
import { initializeApp } from './server/index.js';
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';
import config from './config/index.js';

const startApplication = async () => {
  try {
    console.log(' Starting XTS Copy Trade Backend Server...');
    console.log(`Environment: ${config.server.env} ${config.server.isDev ? '(Development Mode)' : '(Production Mode)'}`);
    console.log(`Version: ${config.api.version}`);
    console.log(` Database: ${config.database.isDev ? 'Local MongoDB' : 'Production MongoDB'}`);
    console.log(`Log Level: ${config.logging.level}`);
    
    console.log(' Connecting to database...');
    console.log(` MongoDB URI: ${config.database.mongoUri}`);
    await connectDB();
    console.log(' Database connected successfully');
    
    console.log('Initializing application components...');
    const { app, httpServer } = await initializeApp();
    
    setupGracefulShutdown(httpServer);
    
    console.log('Application started successfully!');
    
  } catch (error) {
    console.error(' Failed to start application:', error);
    process.exit(1);
  }
};

startApplication();
