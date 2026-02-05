const mongoDBService = require('./mongodb.service');
const embeddingService = require('./embedding.service');
const geminiService = require('./gemini.service');
const redisService = require('./redis-cloud.service');

class RAGService {
    constructor() {
        this.isInitialized = false;
        this.config = {
            similarityThresholdHigh: parseFloat(process.env.SIMILARITY_THRESHOLD_HIGH) || 0.85,
            similarityThresholdLow: parseFloat(process.env.SIMILARITY_THRESHOLD_LOW) || 0.75,
            maxRetrievalResults: parseInt(process.env.MAX_RETRIEVAL_RESULTS) || 3,
            maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH) || 4000,
            cacheEnabled: true
        };
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing RAG Service...');
            
            // Check if all required services are available
            const servicesStatus = {
                mongodb: mongoDBService.isAvailable(),
                embedding: embeddingService.isServiceAvailable(),
                gemini: geminiService.isServiceAvailable(),
                redis: redisService.isAvailable()
            };
            
            console.log('📊 Services Status:', servicesStatus);
            
            if (!servicesStatus.mongodb) {
                console.log('⚠️  MongoDB not available - RAG will use fallback responses');
            }
            
            if (!servicesStatus.embedding) {
                console.log('⚠️  Embedding service not available - Vector search disabled');
            }
            
            if (!servicesStatus.gemini) {
                console.log('⚠️  Gemini service not available - Using fallback responses');
            }
            
            this.isInitialized = true;
            console.log('✅ RAG Service initialized');
            console.log(`🎯 Similarity thresholds: High=${this.config.similarityThresholdHigh}, Low=${this.config.similarityThresholdLow}`);
            console.log(`📊 Max retrieval results: ${this.config.maxRetrievalResults}`);
            
        } catch (error) {
            console.error('❌ RAG Service initialization failed:', error.message);
            this.isInitialized = false;
        }
    }
    
    // Main RAG pipeline: Query → Retrieve → Generate
    async processQuery(userQuery, options = {}) {
        try {
            const {
                userId = 'anonymous',
                category = null,
                conversationHistory = [],
                useCache = true
            } = options;
            
            console.log(`🔍 Processing RAG query for user: ${userId}`);
            console.log(`❓ Query: "${userQuery.substring(0, 100)}..."`);
            
            const startTime = Date.now();
            
            // Step 1: Check cache first
            let cachedResponse = null;
            if (useCache && redisService.isAvailable()) {
                cachedResponse = await redisService.getCachedResponse(userQuery);
                if (cachedResponse) {
                    console.log('🎯 Cache hit - returning cached response');
                    return {
                        response: cachedResponse,
                        cached: true,
                        processingTime: Date.now() - startTime,
                        confidence: { level: 'cached', score: 1.0 },
                        contextUsed: 0,
                        userId,
                        timestamp: new Date().toISOString()
                    };
                }
            }
            
            // Step 2: Retrieve relevant context
            const retrievalResult = await this.retrieveContext(userQuery, { category });
            
            // Step 3: Generate response with context
            const generationResult = await this.generateResponse(
                userQuery, 
                retrievalResult.context, 
                { userId, conversationHistory }
            );
            
            // Step 4: Cache the response if it's high quality
            if (useCache && redisService.isAvailable() && generationResult.confidence.level === 'high') {
                await redisService.cacheMessageResponse(userQuery, generationResult.response, userId);
            }
            
            const totalTime = Date.now() - startTime;
            
            const result = {
                response: generationResult.response,
                cached: false,
                processingTime: totalTime,
                confidence: generationResult.confidence,
                contextUsed: retrievalResult.context.length,
                contextSources: retrievalResult.context.map(ctx => ({
                    question: ctx.question,
                    category: ctx.category,
                    score: ctx.score
                })),
                retrievalTime: retrievalResult.processingTime,
                generationTime: generationResult.processingTime,
                userId,
                timestamp: new Date().toISOString(),
                model: generationResult.model
            };
            
            console.log(`✅ RAG processing completed in ${totalTime}ms`);
            console.log(`📊 Confidence: ${result.confidence.level} (${(result.confidence.score * 100).toFixed(1)}%)`);
            
            return result;
            
        } catch (error) {
            console.error('❌ RAG query processing failed:', error.message);
            
            // Fallback response
            return await this.generateFallbackResponse(userQuery, options);
        }
    }
    
    // Retrieve relevant context from vector database
    async retrieveContext(userQuery, options = {}) {
        const startTime = Date.now();
        
        try {
            const { category = null } = options;
            
            console.log('🔍 Retrieving context from vector database...');
            
            // Check if services are available
            if (!mongoDBService.isAvailable() || !embeddingService.isServiceAvailable()) {
                console.log('⚠️  Vector search not available - using fallback');
                return {
                    context: [],
                    processingTime: Date.now() - startTime,
                    method: 'fallback',
                    error: 'Vector search services not available'
                };
            }
            
            // Generate embedding for user query
            const embeddingResult = await embeddingService.generateEmbedding(userQuery, { 
                category, 
                includeCategory: !!category 
            });
            
            // Perform vector search
            const searchResult = await mongoDBService.vectorSearch(embeddingResult.embedding, {
                limit: this.config.maxRetrievalResults,
                threshold: this.config.similarityThresholdLow,
                category
            });
            
            const processingTime = Date.now() - startTime;
            
            console.log(`📚 Retrieved ${searchResult.totalFound} relevant contexts in ${processingTime}ms`);
            
            return {
                context: searchResult.results,
                categorized: searchResult.categorized,
                totalFound: searchResult.totalFound,
                hasHighConfidence: searchResult.hasHighConfidence,
                hasMediumConfidence: searchResult.hasMediumConfidence,
                processingTime,
                method: 'vector_search',
                queryEmbedding: embeddingResult.embedding,
                fallback: searchResult.fallback || false
            };
            
        } catch (error) {
            console.error('❌ Context retrieval failed:', error.message);
            
            return {
                context: [],
                processingTime: Date.now() - startTime,
                method: 'error',
                error: error.message
            };
        }
    }
    
    // Generate response using retrieved context
    async generateResponse(userQuery, context, options = {}) {
        const startTime = Date.now();
        
        try {
            const {
                userId = 'anonymous',
                conversationHistory = []
            } = options;
            
            console.log('🤖 Generating response with LLM...');
            
            // Check if Gemini service is available
            if (!geminiService.isServiceAvailable()) {
                console.log('⚠️  Gemini service not available - using fallback');
                return this.generateStaticResponse(userQuery, context);
            }
            
            // Generate response using Gemini with RAG context
            const result = await geminiService.generateRAGResponse(userQuery, context, {
                userId,
                conversationHistory
            });
            
            const processingTime = Date.now() - startTime;
            
            return {
                ...result,
                processingTime
            };
            
        } catch (error) {
            console.error('❌ Response generation failed:', error.message);
            
            // Fallback to static response
            return this.generateStaticResponse(userQuery, context);
        }
    }
    
    // Generate static response when LLM is not available
    generateStaticResponse(userQuery, context) {
        const startTime = Date.now();
        
        if (context.length === 0) {
            return {
                response: "I apologize, but I don't have specific information about your question. Please contact our customer support team for personalized assistance.",
                confidence: { level: 'low', score: 0.2, reason: 'No relevant context found' },
                processingTime: Date.now() - startTime,
                model: 'static_fallback',
                type: 'fallback'
            };
        }
        
        // Use the highest scoring context item
        const bestMatch = context[0];
        
        if (bestMatch.score >= this.config.similarityThresholdHigh) {
            return {
                response: bestMatch.answer,
                confidence: { level: 'high', score: bestMatch.score, reason: 'Direct FAQ match' },
                processingTime: Date.now() - startTime,
                model: 'static_direct',
                type: 'direct_match',
                sourceQuestion: bestMatch.question,
                sourceCategory: bestMatch.category
            };
        } else {
            return {
                response: `Based on our FAQ, here's what I found: ${bestMatch.answer}\n\nIf this doesn't fully answer your question, please contact our support team for more specific help.`,
                confidence: { level: 'medium', score: bestMatch.score, reason: 'Partial FAQ match' },
                processingTime: Date.now() - startTime,
                model: 'static_partial',
                type: 'partial_match',
                sourceQuestion: bestMatch.question,
                sourceCategory: bestMatch.category
            };
        }
    }
    
    // Generate fallback response when RAG pipeline fails
    async generateFallbackResponse(userQuery, options = {}) {
        const { userId = 'anonymous' } = options;
        
        console.log('🔄 Generating fallback response...');
        
        // Try simple Gemini response without RAG
        if (geminiService.isServiceAvailable()) {
            try {
                const result = await geminiService.generateSimpleResponse(userQuery, {
                    systemPrompt: 'You are a helpful ecommerce customer support assistant. Provide a brief, helpful response and suggest contacting support for specific issues.'
                });
                
                return {
                    response: result.response,
                    cached: false,
                    processingTime: 1000,
                    confidence: { level: 'low', score: 0.4, reason: 'Fallback LLM response' },
                    contextUsed: 0,
                    userId,
                    timestamp: new Date().toISOString(),
                    model: result.model,
                    type: 'fallback_llm'
                };
            } catch (error) {
                console.error('❌ Fallback LLM response failed:', error.message);
            }
        }
        
        // Ultimate fallback - static response
        return {
            response: "I apologize, but I'm experiencing technical difficulties. Please contact our customer support team directly for assistance with your question.",
            cached: false,
            processingTime: 100,
            confidence: { level: 'low', score: 0.1, reason: 'Static fallback' },
            contextUsed: 0,
            userId,
            timestamp: new Date().toISOString(),
            model: 'static_fallback',
            type: 'static_fallback'
        };
    }
    
    // Get RAG service statistics
    async getStats() {
        try {
            const mongoStats = await mongoDBService.getStats();
            const embeddingStats = embeddingService.getStats();
            const geminiStats = geminiService.getStats();
            const redisStats = redisService.isAvailable() ? await redisService.getCacheStats() : null;
            
            return {
                initialized: this.isInitialized,
                config: this.config,
                services: {
                    mongodb: mongoStats,
                    embedding: embeddingStats,
                    gemini: geminiStats,
                    redis: redisStats
                },
                capabilities: {
                    vectorSearch: mongoDBService.isAvailable() && embeddingService.isServiceAvailable(),
                    llmGeneration: geminiService.isServiceAvailable(),
                    caching: redisService.isAvailable(),
                    fallbackResponses: true
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting RAG stats:', error.message);
            return { error: error.message };
        }
    }
    
    // Test the complete RAG pipeline
    async testPipeline() {
        console.log('🧪 Testing RAG pipeline...');
        
        const testQueries = [
            'How long does shipping take?',
            'What is your return policy?',
            'How can I track my order?'
        ];
        
        const results = [];
        
        for (const query of testQueries) {
            try {
                console.log(`\n🔍 Testing query: "${query}"`);
                const result = await this.processQuery(query, { 
                    userId: 'test_user',
                    useCache: false 
                });
                
                results.push({
                    query,
                    success: true,
                    response: result.response.substring(0, 100) + '...',
                    confidence: result.confidence,
                    contextUsed: result.contextUsed,
                    processingTime: result.processingTime
                });
                
                console.log(`✅ Success: ${result.confidence.level} confidence, ${result.contextUsed} contexts`);
                
            } catch (error) {
                console.error(`❌ Test failed for "${query}":`, error.message);
                results.push({
                    query,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`\n🎯 Pipeline test completed: ${successCount}/${testQueries.length} successful`);
        
        return {
            totalTests: testQueries.length,
            successful: successCount,
            failed: testQueries.length - successCount,
            results
        };
    }
}

// Create singleton instance
const ragService = new RAGService();

module.exports = ragService;