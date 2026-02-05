#!/usr/bin/env node
/**
 * Production Startup Script
 * Starts both HTTP server and WebSocket server in production
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Backend Services in Production Mode...');
console.log('📊 Environment:', process.env.NODE_ENV || 'production');
console.log('🔧 Port Configuration:');
console.log(`   HTTP Server: ${process.env.PORT || 4000}`);
console.log(`   WebSocket Server: ${process.env.SOCKET_PORT || 3000}`);

// Start HTTP server
const httpServer = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
});

// Start WebSocket server
const socketServer = spawn('node', ['sockets-clean.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM, shutting down gracefully...');
    httpServer.kill('SIGTERM');
    socketServer.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('📡 Received SIGINT, shutting down gracefully...');
    httpServer.kill('SIGINT');
    socketServer.kill('SIGINT');
});

// Handle server exits
httpServer.on('exit', (code) => {
    console.log(`❌ HTTP Server exited with code ${code}`);
    if (code !== 0) {
        process.exit(code);
    }
});

socketServer.on('exit', (code) => {
    console.log(`❌ WebSocket Server exited with code ${code}`);
    if (code !== 0) {
        process.exit(code);
    }
});

// Handle server errors
httpServer.on('error', (error) => {
    console.error('❌ HTTP Server error:', error);
    process.exit(1);
});

socketServer.on('error', (error) => {
    console.error('❌ WebSocket Server error:', error);
    process.exit(1);
});

console.log('✅ Both servers started successfully');
console.log('🔗 HTTP Server: http://localhost:' + (process.env.PORT || 4000));
console.log('🔗 WebSocket Server: ws://localhost:' + (process.env.SOCKET_PORT || 3000));