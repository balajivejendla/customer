// Test Redis Cloud connection
const { createClient } = require('redis');

async function testRedisCloud() {
    console.log('🔍 Testing Redis Cloud connection...');
    
    try {
        const client = createClient({
            username: 'default',
            password: 'BcQvq3pOFBaS9spDn7iYhpw1opVdbEMz',
            socket: {
                host: 'redis-13911.crce217.ap-south-1-1.ec2.cloud.redislabs.com',
                port: 13911,
                connectTimeout: 10000,
                commandTimeout: 5000
            }
        });

        client.on('error', err => {
            console.error('❌ Redis Client Error:', err.message);
        });

        client.on('connect', () => {
            console.log('🔗 Redis connecting...');
        });

        client.on('ready', () => {
            console.log('✅ Redis connected and ready');
        });

        console.log('🔗 Attempting to connect...');
        await client.connect();
        
        console.log('📡 Testing ping...');
        const pingResult = await client.ping();
        console.log('✅ Ping result:', pingResult);
        
        console.log('📝 Testing set/get...');
        await client.set('test_key', 'test_value');
        const result = await client.get('test_key');
        console.log('✅ Test result:', result);
        
        console.log('🧹 Cleaning up...');
        await client.del('test_key');
        
        await client.disconnect();
        console.log('✅ Redis Cloud connection test successful!');
        
    } catch (error) {
        console.error('❌ Redis Cloud connection test failed:', error.message);
        console.error('Full error:', error);
    }
}

testRedisCloud();