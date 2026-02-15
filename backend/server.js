const app = require('./src/app');
const { pool } = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Test database connection before starting server
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }

  console.log('✅ Database connected successfully');
  console.log('📅 Database time:', res.rows[0].now);

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🏦 KudiPal API Server Running           ║
║                                                           ║
║  Environment: ${process.env.NODE_ENV?.toUpperCase().padEnd(15, ' ')} Port: ${PORT.toString().padStart(5, ' ')}          ║
║                                                           ║
║  🚀 Server:     http://localhost:${PORT}                      ║
║  📊 Health:     http://localhost:${PORT}/health               ║
║  🔐 API:        http://localhost:${PORT}/api/v1               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    console.log('\n🛑 Received shutdown signal, closing server gracefully...');
    
    server.close(() => {
      console.log('👋 Server closed');
      
      pool.end(() => {
        console.log('🔌 Database connection pool closed');
        process.exit(0);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after 10 seconds');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });
});
