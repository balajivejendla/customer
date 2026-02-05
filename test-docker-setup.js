#!/usr/bin/env node
/**
 * Docker Setup Test Script
 * Tests Redis connection and basic functionality in Docker environment
 */

const redis = require('redis');
require('dotenv').config();

console.log('🐳 Testing Docker Setup...');
console.log('📊 Environment Variables:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   REDIS_ENABLED: ${process.env.REDIS_ENABLED}`);
console.log(`   REDIS_CLOUD_HOST: ${process.env.REDIS_CLOUD_HOST}`);
console.log(`   REDIS_CLOUD_PORT: ${process.env.REDIS_CLOUD_PORT}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   SOCKET_PORT: ${process.env.SOCKET_PORT}`);

async function testRedisConnection() {
    try {
        const redisHost = process.env.REDIS_CLOUD_HOST || 'localhost';
        const redisPort = process.env.REDIS_CLOUD_PORT || 6379;
        
        console.log(`\n🔗 Testing Redis connection to ${redisHost}:${redisPort}...`);
        
        const client = redis.createClient({
            socket: {
                host: redisHost,
                port: redisPort
            }
        });
        
        client.on('error', (err) => {
            console.log('❌ Redis connection error:', err.message);
        });
        
        client.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });
        
        await client.connect();
        
        // Test basic operations
        console.log('🧪 Testing Redis operations...');
        
        // Set a test value
        await client.set('docker_test', 'Hello from Docker!');
        console.log('✅ Redis SET operation successful');
        
        // Get the test value
        const value = await client.get('docker_test');
        console.log(`✅ Redis GET operation successful: ${value}`);
        
        // Clean up
        await client.del('docker_test');
        console.log('✅ Redis DEL operation successful');
        
        await client.disconnect();
        console.log('✅ Redis disconnected cleanly');
        
        return true;
        
    } catch (error) {
        console.error('❌ Redis test failed:', error.message);
        return false;
    }
}

async function testEnvironmentVariables() {
    console.log('\n🔧 Testing Environment Variables...');
    
    const requiredVars = [
        'JWT_SECRET',
        'MONGODB_URI',
        'GOOGLE_API_KEY',
        'REDIS_CLOUD_HOST',
        'REDIS_CLOUD_PORT'
    ];
    
    let allPresent = true;
    
    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`✅ ${varName}: Present`);
        } else {
            console.log(`❌ ${varName}: Missing`);
            allPresent = false;
        }
    }
    
    return allPresent;
}

async function runTests() {
    console.log('\n🚀 Starting Docker Setup Tests...\n');
    
    const envTest = await testEnvironmentVariables();
    const redisTest = await testRedisConnection();
    
    console.log('\n📊 Test Results:');
    console.log(`   Environment Variables: ${envTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Redis Connection: ${redisTest ? '✅ PASS' : '❌ FAIL'}`);
    
    if (envTest && redisTest) {
        console.log('\n🎉 All tests passed! Docker setup is ready.');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed. Please check the configuration.');
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGTERM', () => {
    console.log('\n📡 Received SIGTERM, exiting...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📡 Received SIGINT, exiting...');
    process.exit(0);
});

// Run tests
runTests().catch((error) => {
    console.error('🚨 Test runner error:', error);
    process.exit(1);
});