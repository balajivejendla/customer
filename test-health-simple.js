const http = require('http');

function testHealth() {
    console.log('🏥 Testing health endpoint...');
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/health',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:', data);
            if (res.statusCode === 200) {
                console.log('✅ Health check passed');
            } else {
                console.log('❌ Health check failed');
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
    });
    
    req.end();
}

testHealth();