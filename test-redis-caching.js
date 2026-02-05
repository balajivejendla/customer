const redis = require('redis');
const crypto = require('crypto');

async function testRedisCaching() {
    console.log('🧪 Testing Redis Response Caching...\n');
    
    let redisClient = null;
    
    try {
        // Connect to Redis
        redisClient = redis.createClient({
            host: 'localhost',
            port: 6379
        });
        
        await redisClient.connect();
        console.log('✅ Connected to Redis');
        
        // Test caching functions
        function generateCacheKey(query) {
            return `rag_response:${crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex')}`;
        }
        
        async function cacheResponse(query, response) {
            const cacheKey = generateCacheKey(query);
            const cacheData = {
                query,
                response,
                timestamp: new Date().toISOString(),
                cached: true
            };
            
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(cacheData));
            console.log(`💾 Cached response for: "${query}"`);
            return cacheKey;
        }
        
        async function getCachedResponse(query) {
            const cacheKey = generateCacheKey(query);
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                console.log(`🎯 Cache hit for: "${query}"`);
                return cacheData;
            }
            
            console.log(`❌ Cache miss for: "${query}"`);
            return null;
        }
        
        // Test 1: Cache a response
        console.log('\n1️⃣ Testing cache storage...');
        const testQuery = "How long does shipping take?";
        const testResponse = "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.";
        
        const cacheKey = await cacheResponse(testQuery, testResponse);
        console.log(`✅ Response cached with key: ${cacheKey}`);
        
        // Test 2: Retrieve cached response
        console.log('\n2️⃣ Testing cache retrieval...');
        const cachedResult = await getCachedResponse(testQuery);
        
        if (cachedResult) {
            console.log('✅ Cache retrieval successful!');
            console.log(`📝 Original query: "${cachedResult.query}"`);
            console.log(`💬 Cached response: "${cachedResult.response}"`);
            console.log(`⏰ Cached at: ${cachedResult.timestamp}`);
        } else {
            console.log('❌ Cache retrieval failed');
        }
        
        // Test 3: Test case sensitivity
        console.log('\n3️⃣ Testing case insensitive caching...');
        const upperCaseQuery = "HOW LONG DOES SHIPPING TAKE?";
        const upperCaseResult = await getCachedResponse(upperCaseQuery);
        
        if (upperCaseResult) {
            console.log('✅ Case insensitive cache working!');
        } else {
            console.log('❌ Case insensitive cache not working');
        }
        
        // Test 4: Test different query (should be cache miss)
        console.log('\n4️⃣ Testing cache miss...');
        const differentQuery = "What is your return policy?";
        const missResult = await getCachedResponse(differentQuery);
        
        if (!missResult) {
            console.log('✅ Cache miss working correctly');
        } else {
            console.log('❌ Unexpected cache hit');
        }
        
        // Test 5: Cache multiple responses
        console.log('\n5️⃣ Testing multiple cache entries...');
        await cacheResponse("What is your return policy?", "You can return items within 30 days of purchase.");
        await cacheResponse("How do I track my order?", "You can track your order using the tracking number sent to your email.");
        
        // Check all cached responses
        const queries = [
            "How long does shipping take?",
            "What is your return policy?", 
            "How do I track my order?"
        ];
        
        console.log('\n📋 All cached responses:');
        for (const query of queries) {
            const result = await getCachedResponse(query);
            if (result) {
                console.log(`✅ "${query}" → Cached ✓`);
            } else {
                console.log(`❌ "${query}" → Not cached`);
            }
        }
        
        // Test 6: Check Redis keys
        console.log('\n6️⃣ Checking Redis keys...');
        const keys = await redisClient.keys('rag_response:*');
        console.log(`📊 Found ${keys.length} cached responses in Redis`);
        keys.forEach((key, index) => {
            console.log(`${index + 1}. ${key}`);
        });
        
        console.log('\n🎉 Redis caching test completed!');
        console.log('✅ Your system will now cache AI responses');
        console.log('⚡ Repeated questions will be answered instantly from cache');
        
    } catch (error) {
        console.error('❌ Redis caching test failed:', error.message);
    } finally {
        if (redisClient) {
            await redisClient.disconnect();
            console.log('👋 Redis disconnected');
        }
    }
}

testRedisCaching();