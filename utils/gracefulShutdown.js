import config from '../config/index.js';

export const setupGracefulShutdown = (httpServer) => {
  const shutdown = async (signal) => {
    console.log(`\n Received ${signal}. Starting graceful shutdown...`);
    
    try {
      httpServer.close(() => {
        console.log(' HTTP server closed');
      });

      setTimeout(() => {
        console.log(' Graceful shutdown completed');
        process.exit(0);
      }, 5000);

    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });

  console.log('✅ Graceful shutdown handlers registered');
};
