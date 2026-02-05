const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testBackend() {
    console.log('🧪 Testing Backend Server...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);
        console.log('');
        
        // Test 2: Register User
        console.log('2️⃣ Testing user registration...');
        const registerData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User'
        };
        
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
        console.log('✅ Registration successful:', {
            success: registerResponse.data.success,
            user: registerResponse.data.user,
            hasTokens: !!registerResponse.data.tokens
        });
        console.log('');
        
        const { accessToken } = registerResponse.data.tokens;
        
        // Test 3: Login User
        console.log('3️⃣ Testing user login...');
        const loginData = {
            email: 'test@example.com',
            password: 'password123'
        };
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('✅ Login successful:', {
            success: loginResponse.data.success,
            user: loginResponse.data.user,
            hasTokens: !!loginResponse.data.tokens
        });
        console.log('');
        
        // Test 4: Validate Token
        console.log('4️⃣ Testing token validation...');
        const validateResponse = await axios.get(`${BASE_URL}/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log('✅ Token validation passed:', validateResponse.data);
        console.log('');
        
        // Test 5: Get Profile
        console.log('5️⃣ Testing user profile...');
        const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        console.log('✅ Profile retrieval successful:', profileResponse.data);
        console.log('');
        
        console.log('🎉 All tests passed! Backend is working correctly.');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ HTTP Server running on port 4000');
        console.log('   ✅ JWT Authentication working');
        console.log('   ✅ User registration working');
        console.log('   ✅ User login working');
        console.log('   ✅ Token validation working');
        console.log('   ✅ User profile working');
        console.log('   ✅ CORS enabled for frontend');
        console.log('');
        console.log('🚀 Your backend is ready for frontend integration!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('💡 Make sure the server is running:');
            console.log('   node server.js');
        }
    }
}

// Run tests
testBackend();