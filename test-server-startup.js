// Simple server startup test to identify issues
console.log('🔍 Testing server startup dependencies...\n');

// Test 1: Basic Node.js modules
try {
    console.log('✅ Testing basic Node.js modules...');
    const express = require('express');
    const cors = require('cors');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const rateLimit = require('express-rate-limit');
    const helmet = require('helmet');
    console.log('✅ Basic modules loaded successfully\n');
} catch (error) {
    console.error('❌ Basic modules failed:', error.message);
    console.log('💡 Run: npm install\n');
    process.exit(1);
}

// Test 2: Environment variables
try {
    console.log('✅ Testing environment variables...');
    require('dotenv').config();
    console.log('✅ Environment variables loaded\n');
} catch (error) {
    console.error('❌ Environment variables failed:', error.message);
    console.log('💡 Make sure .env file exists\n');
}

// Test 3: Service dependencies
const services = [
    'redis.service',
    'mongodb.service', 
    'user.service',
    'queue.service',
    'queue.processors',
    'queue.dashboard',
    'rag.service',
    'gemini.service',
    'embedding.service'
];

console.log('✅ Testing service dependencies...');
for (const service of services) {
    try {
        require(`./${service}`);
        console.log(`  ✅ ${service}.js loaded`);
    } catch (error) {
        console.error(`  ❌ ${service}.js failed:`, error.message);
        
        // Provide specific help for common issues
        if (service === 'mongodb.service') {
            console.log('    💡 Check MongoDB connection string in .env');
        } else if (service === 'redis.service') {
            console.log('    💡 Make sure Redis is running: redis-server');
        } else if (service === 'gemini.service') {
            console.log('    💡 Check GOOGLE_API_KEY in .env');
        }
    }
}

console.log('\n🎯 If all services loaded successfully, try running:');
console.log('   node server.js');
console.log('\n📋 If you see errors above, fix them first before running the server.');