#!/usr/bin/env node
/**
 * Docker Readiness Check
 * Checks if everything is ready for Docker deployment without requiring Docker to be running
 */

const fs = require('fs');
const path = require('path');

console.log('🐳 Docker Readiness Check');
console.log('=========================\n');

let allGood = true;
const issues = [];
const warnings = [];

// Check 1: Required files
console.log('📁 Checking required files...');
const requiredFiles = [
    { file: 'Dockerfile', critical: true },
    { file: 'docker-compose.yml', critical: true },
    { file: '.env.docker', critical: true },
    { file: 'package.json', critical: true },
    { file: 'package-lock.json', critical: true },
    { file: 'server.js', critical: true },
    { file: 'start-production.js', critical: true },
    { file: 'sockets-clean.js', critical: true },
    { file: 'healthcheck.js', critical: true },
    { file: '.dockerignore', critical: false }
];

requiredFiles.forEach(({ file, critical }) => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        if (critical) {
            issues.push(`Missing critical file: ${file}`);
            allGood = false;
        } else {
            warnings.push(`Missing optional file: ${file}`);
        }
    }
});

// Check 2: Environment variables in .env.docker
console.log('\n🔧 Checking environment configuration...');
try {
    const envContent = fs.readFileSync(path.join(__dirname, '.env.docker'), 'utf8');
    const requiredEnvVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'MONGODB_URI',
        'GOOGLE_API_KEY',
        'REDIS_CLOUD_HOST',
        'REDIS_CLOUD_PORT',
        'PORT',
        'SOCKET_PORT'
    ];
    
    requiredEnvVars.forEach(varName => {
        if (envContent.includes(`${varName}=`)) {
            const line = envContent.split('\n').find(l => l.startsWith(`${varName}=`));
            const value = line ? line.split('=')[1] : '';
            if (value && value.trim() && !value.includes('your-') && !value.includes('change-')) {
                console.log(`✅ ${varName} - configured`);
            } else {
                console.log(`⚠️ ${varName} - needs to be changed from default`);
                warnings.push(`${varName} appears to be using default/placeholder value`);
            }
        } else {
            console.log(`❌ ${varName} - missing`);
            issues.push(`Missing environment variable: ${varName}`);
            allGood = false;
        }
    });
    
    // Check Redis configuration specifically
    if (envContent.includes('REDIS_CLOUD_HOST=redis')) {
        console.log('✅ Redis configured for Docker (host=redis)');
    } else {
        console.log('❌ Redis not configured for Docker');
        issues.push('REDIS_CLOUD_HOST should be "redis" for Docker');
        allGood = false;
    }
    
} catch (error) {
    console.log('❌ Cannot read .env.docker file');
    issues.push('Cannot read .env.docker file');
    allGood = false;
}

// Check 3: Package.json start script
console.log('\n📦 Checking package.json configuration...');
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log(`✅ Start script: ${packageJson.scripts.start}`);
        if (packageJson.scripts.start.includes('start-production.js')) {
            console.log('✅ Using production startup script');
        } else {
            warnings.push('Start script not using start-production.js');
        }
    } else {
        console.log('❌ No start script found');
        issues.push('Missing start script in package.json');
        allGood = false;
    }
    
    // Check dependencies
    const criticalDeps = ['express', 'socket.io', 'redis', 'jsonwebtoken', 'mongodb'];
    const missingDeps = criticalDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
        console.log('✅ All critical dependencies present');
    } else {
        console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
        issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        allGood = false;
    }
    
} catch (error) {
    console.log('❌ Cannot read package.json');
    issues.push('Cannot read package.json');
    allGood = false;
}

// Check 4: Docker Compose syntax (basic)
console.log('\n🐙 Checking Docker Compose configuration...');
try {
    const composeContent = fs.readFileSync(path.join(__dirname, 'docker-compose.yml'), 'utf8');
    
    if (composeContent.includes('services:')) {
        console.log('✅ Docker Compose has services section');
    } else {
        console.log('❌ Docker Compose missing services section');
        issues.push('Invalid docker-compose.yml structure');
        allGood = false;
    }
    
    if (composeContent.includes('redis:') && composeContent.includes('backend:')) {
        console.log('✅ Both Redis and Backend services defined');
    } else {
        console.log('❌ Missing Redis or Backend service definition');
        issues.push('Missing service definitions in docker-compose.yml');
        allGood = false;
    }
    
    if (composeContent.includes('env_file:')) {
        console.log('✅ Environment file configuration found');
    } else {
        console.log('⚠️ No env_file configuration (using inline environment)');
        warnings.push('Consider using env_file for cleaner configuration');
    }
    
} catch (error) {
    console.log('❌ Cannot read docker-compose.yml');
    issues.push('Cannot read docker-compose.yml');
    allGood = false;
}

// Final summary
console.log('\n🎯 Readiness Summary');
console.log('===================');

if (allGood && issues.length === 0) {
    console.log('✅ Docker setup is ready!');
    console.log('\n🚀 Next steps:');
    console.log('1. Start Docker Desktop');
    console.log('2. Run: test-docker.bat');
    console.log('3. Or manually: docker-compose up --build -d');
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings (non-critical):');
        warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
} else {
    console.log('❌ Docker setup has issues that need to be fixed');
    console.log('\n🚨 Critical Issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
    }
}

console.log('\n📋 Docker Status Check:');
console.log('=======================');

// Check if Docker is available (without requiring it to be running)
const { execSync } = require('child_process');
try {
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✅ Docker CLI is installed');
    
    try {
        execSync('docker info', { stdio: 'pipe' });
        console.log('✅ Docker Desktop is running');
        console.log('\n🎉 Ready to test! Run: test-docker.bat');
    } catch {
        console.log('⚠️ Docker Desktop is not running');
        console.log('\n📋 To test:');
        console.log('1. Start Docker Desktop');
        console.log('2. Wait for it to fully start');
        console.log('3. Run: test-docker.bat');
    }
} catch {
    console.log('❌ Docker is not installed');
    console.log('Please install Docker Desktop first');
}

process.exit(allGood ? 0 : 1);