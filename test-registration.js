const axios = require('axios');

async function testRegistration() {
    try {
        console.log('🧪 Testing user registration...');
        console.log('📡 Sending request to http://localhost:4000/auth/register');
        
        const response = await axios.post('http://localhost:4000/auth/register', {
            email: 'test@example.com',
            password: 'testpassword123',
            name: 'Test User'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Registration successful!');
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ Registration failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }
        console.error('Full error:', error);
    }
}

// Also test if server is running
async function testServerHealth() {
    try {
        console.log('🏥 Testing server health...');
        const response = await axios.get('http://localhost:4000/health');
        console.log('✅ Server is healthy:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Server health check failed:', error.message);
        return false;
    }
}

async function runTests() {
    const isHealthy = await testServerHealth();
    if (isHealthy) {
        await testRegistration();
    } else {
        console.error('❌ Server is not responding, skipping registration test');
    }
}

runTests();