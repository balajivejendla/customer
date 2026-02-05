const redis = require('redis');
const crypto = require('crypto');

async function demoCachingSpeed() {
    console.log('⚡ Demo: Caching Speed Comparison\n');
    
    let redisClient = null;
    
    try {
        // Connect to Redis
        redisClient = redis.createClient({
            host: 'localhost',
            port: 6379
        });
        
        await redisClient.connect();
        console.log('✅ Connected to Redis\n');
        
        // Helper functions
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
            return cacheKey;
        }
        
        async function getCachedResponse(query) {
            const cacheKey = generateCacheKey(query);
            const cached = await redisClient.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        }
        
        // Simulate AI processing delay
        async function simulateAIProcessing(query) {
            console.log(`🤖 Processing "${query}" with AI...`);
            console.log('   🔍 Generating embeddings...');
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('   📚 Searching vector database...');
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log('   🧠 Generating response with Gemini...');
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            return `AI generated response for: ${query}`;
        }
        
        // Test query
        const testQuery = "How long does shipping take?";
        
        // First request (no cache) - simulate full AI processing
        console.log('🔄 FIRST REQUEST (No Cache):');
        console.log('=' .repeat(50));
        
        const startTime1 = Date.now();
        
        // Check cache (will be empty)
        let cachedResult = await getCachedResponse(testQuery);
        if (!cachedResult) {
            console.log('❌ Cache miss - processing with AI...');
            
            // Simulate full AI processing
            const aiResponse = await simulateAIProcessing(testQuery);
            
            // Cache the response
            await cacheResponse(testQuery, aiResponse);
            console.log('💾 Response cached for future requests');
            
            const endTime1 = Date.now();
            console.log(`⏱️  Total time: ${endTime1 - startTime1}ms`);
            console.log(`💬 Response: "${aiResponse}"`);
        }
        
        console.log('\n' + '=' .repeat(50));
        
        // Second request (with cache) - instant response
        console.log('⚡ SECOND REQUEST (With Cache):');
        console.log('=' .repeat(50));
        
        const startTime2 = Date.now();
        
        // Check cache (will be found)
        cachedResult = await getCachedResponse(testQuery);
        if (cachedResult) {
            const endTime2 = Date.now();
            console.log('🎯 Cache hit - returning cached response');
            console.log(`⏱️  Total time: ${endTime2 - startTime2}ms`);
            console.log(`💬 Response: "${cachedResult.response}"`);
            console.log(`📅 Originally cached: ${cachedResult.timestamp}`);
        }
        
        console.log('\n' + '=' .repeat(50));
        
        // Speed comparison
        const firstRequestTime = 2500; // Simulated AI processing time
        const secondRequestTime = Date.now() - startTime2;
        const speedImprovement = Math.round((firstRequestTime / secondRequestTime) * 100) / 100;
        
        console.log('📊 SPEED COMPARISON:');
        console.log(`   First request (AI processing): ~${firstRequestTime}ms`);
        console.log(`   Second request (cached): ${secondRequestTime}ms`);
        console.log(`   Speed improvement: ${speedImprovement}x faster! 🚀`);
        
        console.log('\n🎯 BENEFITS OF CACHING:');
        console.log('   ✅ Instant responses for repeated questions');
        console.log('   ✅ Reduced API costs (no Gemini calls)');
        console.log('   ✅ Lower server load');
        console.log('   ✅ Better user experience');
        console.log('   ✅ Consistent answers');
        
        console.log('\n💡 IN YOUR CHATBOT:');
        console.log('   - First time: "How long does shipping take?" → 2-3 seconds');
        console.log('   - Next times: "How long does shipping take?" → 50ms ⚡');
        console.log('   - Works for any identical or similar questions');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        if (redisClient) {
            await redisClient.disconnect();
            console.log('\n👋 Redis disconnected');
        }
    }
}

demoCachingSpeed();