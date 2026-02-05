#!/usr/bin/env node
/**
 * Test Docker Build and Run
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🐳 Testing Docker Build and Run...');

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`🔧 Running: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args, {
            stdio: 'inherit',
            ...options
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
        
        process.on('error', reject);
    });
}

async function testHealthEndpoint(port = 4000, maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${port}/health`, (res) => {
                    if (res.statusCode === 200) {
                        console.log('✅ Health check passed');
                        resolve();
                    } else {
                        reject(new Error(`Health check failed: ${res.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.setTimeout(3000, () => {
                    req.destroy();
                    reject(new Error('Health check timeout'));
                });
            });
            
            return true;
            
        } catch (error) {
            console.log(`⏳ Health check attempt ${i + 1}/${maxRetries} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    throw new Error('Health check failed after all retries');
}

async function main() {
    try {
        // Build Docker image
        console.log('\n📦 Building Docker image...');
        await runCommand('docker', ['build', '-t', 'backend-test', '.']);
        
        // Run Docker container
        console.log('\n🚀 Starting Docker container...');
        const containerProcess = spawn('docker', [
            'run', '--rm', '-p', '4000:4000', '-p', '3000:3000',
            '--env-file', '.env',
            'backend-test'
        ], {
            stdio: 'inherit'
        });
        
        // Wait for container to start
        console.log('\n⏳ Waiting for container to start...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Test health endpoint
        console.log('\n🏥 Testing health endpoint...');
        await testHealthEndpoint();
        
        console.log('\n🎉 Docker test completed successfully!');
        console.log('✅ Docker image builds correctly');
        console.log('✅ Container starts successfully');
        console.log('✅ Health endpoint responds');
        console.log('\n💡 Your backend is ready for deployment to Render!');
        
        // Stop container
        containerProcess.kill('SIGTERM');
        
    } catch (error) {
        console.error('\n❌ Docker test failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Make sure Docker is running');
        console.error('2. Check .env file exists with required variables');
        console.error('3. Verify all dependencies are in package.json');
        process.exit(1);
    }
}

main();