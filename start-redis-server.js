const RedisServer = require('redis-server');

// Create Redis server instance
const server = new RedisServer({
    port: 6379,
    bin: 'redis-server'
});

console.log('🚀 Starting Redis Server on port 6379...');

server.open((err) => {
    if (err === null) {
        console.log('✅ Redis Server started successfully on port 6379');
        console.log('🔗 Redis is now available at localhost:6379');
        console.log('💡 You can now start your backend servers');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Keep this terminal open (Redis server running)');
        console.log('   2. Open new terminal and run: node server.js');
        console.log('   3. Open another terminal and run: node sockets.js');
        console.log('');
        console.log('🛑 Press Ctrl+C to stop Redis server');
    } else {
        console.error('❌ Failed to start Redis server:', err);
        console.log('');
        console.log('💡 Alternative options:');
        console.log('   1. Install Redis manually from: https://github.com/microsoftarchive/redis/releases');
        console.log('   2. Use Docker Desktop: docker run -d -p 6379:6379 redis:latest');
        console.log('   3. Your backend will work without Redis (using in-memory storage)');
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Redis server...');
    server.close(() => {
        console.log('✅ Redis server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Redis server...');
    server.close(() => {
        console.log('✅ Redis server stopped');
        process.exit(0);
    });
});