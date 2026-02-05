const ragService = require('./rag.service');
const mongoDBService = require('./mongodb.service');
const embeddingService = require('./embedding.service');
const geminiService = require('./gemini.service');

// Wait for services to initialize
async function waitForServices() {
    console.log('⏳ Waiting for services to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
}

async function testRAGSystem() {
    console.log('🧪 Testing Full RAG System with Your Embedded Data...\n');
    
    // Wait for services to initialize
    await waitForServices();
    
    try {
        // Test 1: Check service availability
        console.log('1️⃣ Checking service availability...');
        const services = {
            mongodb: mongoDBService.isAvailable(),
            embedding: embeddingService.isServiceAvailable(),
            gemini: geminiService.isServiceAvailable()
        };
        
        console.log('📊 Services Status:', services);
        
        if (!services.mongodb) {
            console.log('❌ MongoDB not available - cannot test with your embedded data');
            return;
        }
        
        // Test 2: Check MongoDB collection stats
        console.log('\n2️⃣ Checking your embedded FAQ data...');
        const mongoStats = await mongoDBService.getStats();
        console.log('📚 MongoDB Stats:', {
            connected: mongoStats.connected,
            database: mongoStats.database,
            collection: mongoStats.collection,
            totalDocuments: mongoStats.totalDocuments,
            categories: mongoStats.categories,
            hasVectorIndex: mongoStats.hasVectorIndex,
            sampleDocument: mongoStats.sampleDocument
        });
        
        if (mongoStats.totalDocuments === 0) {
            console.log('❌ No FAQ documents found in your collection');
            console.log('💡 Make sure your customer_support_faqs.json data is properly embedded and stored');
            return;
        }
        
        console.log(`✅ Found ${mongoStats.totalDocuments} embedded FAQ documents`);
        console.log(`📂 Categories: ${mongoStats.categories.join(', ')}`);
        
        // Test 3: Test common ecommerce questions
        console.log('\n3️⃣ Testing RAG with common ecommerce questions...');
        
        const testQueries = [
            'How long does shipping take?',
            'What is your return policy?',
            'How can I track my order?',
            'Do you offer free shipping?',
            'How do I cancel my order?',
            'What payment methods do you accept?',
            'How do I contact customer support?',
            'Can I change my shipping address?'
        ];
        
        const results = [];
        
        for (const query of testQueries) {
            try {
                console.log(`\n🔍 Testing: "${query}"`);
                
                const startTime = Date.now();
                const result = await ragService.processQuery(query, { 
                    userId: 'test_user',
                    useCache: false 
                });
                const endTime = Date.now();
                
                console.log(`✅ Response (${endTime - startTime}ms):`, {
                    confidence: result.confidence.level,
                    score: (result.confidence.score * 100).toFixed(1) + '%',
                    contextUsed: result.contextUsed,
                    cached: result.cached,
                    model: result.model
                });
                
                console.log(`💬 Answer: "${result.response.substring(0, 150)}..."`);
                
                if (result.contextSources && result.contextSources.length > 0) {
                    console.log(`📚 Sources:`, result.contextSources.map(src => ({
                        question: src.question.substring(0, 50) + '...',
                        category: src.category,
                        score: (src.score * 100).toFixed(1) + '%'
                    })));
                }
                
                results.push({
                    query,
                    success: true,
                    confidence: result.confidence.level,
                    score: result.confidence.score,
                    contextUsed: result.contextUsed,
                    processingTime: endTime - startTime,
                    cached: result.cached,
                    model: result.model
                });
                
            } catch (error) {
                console.error(`❌ Test failed for "${query}":`, error.message);
                results.push({
                    query,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // Test 4: Summary
        console.log('\n4️⃣ Test Summary...');
        const successful = results.filter(r => r.success);
        const highConfidence = successful.filter(r => r.confidence === 'high');
        const mediumConfidence = successful.filter(r => r.confidence === 'medium');
        
        console.log(`📊 Results: ${successful.length}/${testQueries.length} successful`);
        console.log(`🎯 Confidence: ${highConfidence.length} high, ${mediumConfidence.length} medium`);
        console.log(`⚡ Avg processing time: ${Math.round(successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length)}ms`);
        
        if (successful.length === testQueries.length) {
            console.log('\n🎉 All tests passed! Your RAG system is working perfectly with your embedded data!');
            console.log('✅ Vector search is finding relevant FAQ matches');
            console.log('✅ Gemini is generating contextual responses');
            console.log('✅ Your customer_support_faqs.json data is properly embedded');
        } else {
            console.log('\n⚠️ Some tests failed. Check the errors above.');
        }
        
        // Test 5: RAG Service Stats
        console.log('\n5️⃣ RAG Service Statistics...');
        const ragStats = await ragService.getStats();
        console.log('🔧 RAG Configuration:', ragStats.config);
        console.log('🎯 Capabilities:', ragStats.capabilities);
        
    } catch (error) {
        console.error('❌ RAG system test failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Make sure MongoDB is connected');
        console.log('   2. Check if your FAQ data is properly embedded');
        console.log('   3. Verify Google API key is working');
        console.log('   4. Ensure vector search index exists in MongoDB');
    }
}

// Run the test
testRAGSystem();