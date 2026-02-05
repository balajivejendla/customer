const redis = require('redis');

async function testRedis() {
    console.log('🧪 Testing Redis Connection...\n');
    
    let client = null;
    
    try {
        // Create Redis client
        client = redis.createClient({
            host: 'localhost',
            port: 6379
        });
        
        // Connect to Redis
        await client.connect();
        console.log('✅ Connected to Redis successfully');
        
        // Test ping
        const pingResult = await client.ping();
        console.log('✅ Ping test:', pingResult);
        
        // Test set/get
        await client.set('test_key', 'Hello Redis!');
        const value = await client.get('test_key');
        console.log('✅ Set/Get test:', value);
        
        // Test list operations
        await client.lPush('test_list', 'item1', 'item2', 'item3');
        const listItems = await client.lRange('test_list', 0, -1);
        console.log('✅ List operations:', listItems);
        
        // Clean up test data
        await client.del('test_key', 'test_list');
        console.log('✅ Cleanup completed');
        
        console.log('\n🎉 Redis is working perfectly!');
        console.log('🚀 Your backend can now use Redis for:');
        console.log('   - Message history storage');
        console.log('   - User session management');
        console.log('   - Response caching');
        console.log('   - JWT token storage');
        
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.log('\n💡 Make sure Redis is running:');
        console.log('   1. Run: node start-redis-server.js');
        console.log('   2. Or use Docker: docker run -d -p 6379:6379 redis:latest');
        console.log('   3. Or install Redis manually');
        console.log('\n⚠️  Your backend will work without Redis (using in-memory storage)');
    } finally {
        if (client) {
            await client.disconnect();
        }
    }
}

// Run test
testRedis();