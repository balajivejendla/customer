#!/usr/bin/env node
/**
 * Dockerfile Validation Script
 * Validates Dockerfile syntax and checks for common issues
 */

const fs = require('fs');
const path = require('path');

console.log('🐳 Validating Dockerfile...\n');

// Check if Dockerfile exists
const dockerfilePath = path.join(__dirname, 'Dockerfile');
if (!fs.existsSync(dockerfilePath)) {
    console.log('❌ Dockerfile not found!');
    process.exit(1);
}

// Read Dockerfile
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
const lines = dockerfile.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

console.log('📋 Dockerfile Analysis:');
console.log('======================');

// Check basic structure
const checks = {
    hasFrom: false,
    hasWorkdir: false,
    hasCopy: false,
    hasExpose: false,
    hasCmd: false,
    hasHealthcheck: false,
    hasUser: false
};

const issues = [];
const warnings = [];

lines.forEach((line, index) => {
    const trimmed = line.trim().toUpperCase();
    
    if (trimmed.startsWith('FROM')) {
        checks.hasFrom = true;
        if (trimmed.includes('NODE:18')) {
            console.log('✅ Using Node.js 18 base image');
        }
    }
    
    if (trimmed.startsWith('WORKDIR')) {
        checks.hasWorkdir = true;
        console.log('✅ Working directory set');
    }
    
    if (trimmed.startsWith('COPY')) {
        checks.hasCopy = true;
        if (trimmed.includes('PACKAGE*.JSON')) {
            console.log('✅ Package files copied first (good for caching)');
        }
    }
    
    if (trimmed.startsWith('EXPOSE')) {
        checks.hasExpose = true;
        if (trimmed.includes('4000') && trimmed.includes('3001')) {
            console.log('✅ Both ports exposed (4000, 3001)');
        } else if (trimmed.includes('4000')) {
            console.log('✅ Port 4000 exposed');
        } else if (trimmed.includes('3001')) {
            console.log('✅ Port 3001 exposed');
        }
    }
    
    if (trimmed.startsWith('CMD')) {
        checks.hasCmd = true;
        if (trimmed.includes('NPM START')) {
            console.log('✅ Using npm start command');
        }
    }
    
    if (trimmed.startsWith('HEALTHCHECK')) {
        checks.hasHealthcheck = true;
        console.log('✅ Health check configured');
    }
    
    if (trimmed.startsWith('USER')) {
        checks.hasUser = true;
        console.log('✅ Non-root user configured (security best practice)');
    }
    
    if (trimmed.startsWith('RUN NPM CI')) {
        console.log('✅ Using npm ci for production builds');
    }
});

console.log('\n🔍 Validation Results:');
console.log('======================');

// Check required components
if (!checks.hasFrom) issues.push('Missing FROM instruction');
if (!checks.hasWorkdir) warnings.push('No WORKDIR set');
if (!checks.hasCopy) issues.push('No COPY instructions found');
if (!checks.hasExpose) warnings.push('No EXPOSE instructions found');
if (!checks.hasCmd) issues.push('No CMD instruction found');
if (!checks.hasHealthcheck) warnings.push('No health check configured');
if (!checks.hasUser) warnings.push('Running as root user (security risk)');

// Check required files exist
const requiredFiles = [
    'package.json',
    'package-lock.json',
    'server.js',
    'start-production.js',
    'sockets-clean.js',
    'healthcheck.js'
];

console.log('\n📁 Required Files Check:');
console.log('========================');

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        issues.push(`Missing required file: ${file}`);
    }
});

// Check package.json start script
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log(`✅ Start script: ${packageJson.scripts.start}`);
        if (packageJson.scripts.start.includes('start-production.js')) {
            console.log('✅ Using production startup script');
        }
    } else {
        issues.push('No start script in package.json');
    }
} catch (error) {
    issues.push('Cannot read package.json');
}

// Final results
console.log('\n🎯 Summary:');
console.log('===========');

if (issues.length === 0) {
    console.log('✅ Dockerfile validation passed!');
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log('\n🚀 Dockerfile is ready for building');
    console.log('\nTo test the build:');
    console.log('1. Start Docker Desktop');
    console.log('2. Run: docker build -t backend-app .');
    console.log('3. Run: docker-compose up --build -d');
    
} else {
    console.log('❌ Dockerfile validation failed!');
    console.log('\n🚨 Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    
    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
    }
}

console.log('\n📋 Next Steps:');
console.log('==============');
console.log('1. Start Docker Desktop');
console.log('2. Run: test-docker.bat');
console.log('3. Or manually: docker-compose up --build -d');

process.exit(issues.length > 0 ? 1 : 0);