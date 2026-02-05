const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config();

class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.isAvailable = false;
        this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        this.maxContextLength = parseInt(process.env.MAX_CONTEXT_LENGTH) || 4000;
        
        this.initialize();
    }
    
    initialize() {
        try {
            if (!process.env.GOOGLE_API_KEY) {
                console.log('⚠️  Google API key not provided. Gemini service disabled.');
                return;
            }
            
            this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            this.model = this.genAI.getGenerativeModel({ 
                model: this.modelName,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            });
            
            this.isAvailable = true;
            console.log('✅ Google Gemini Service initialized');
            console.log(`🤖 Model: ${this.modelName}`);
            console.log(`📏 Max context length: ${this.maxContextLength}`);
            
        } catch (error) {
            console.error('❌ Gemini Service initialization failed:', error.message);
            this.isAvailable = false;
        }
    }
    
    // Check if service is available
    isServiceAvailable() {
        return this.isAvailable && this.model;
    }
    
    // Generate response using RAG context
    async generateRAGResponse(userQuery, retrievedContext, options = {}) {
        if (!this.isServiceAvailable()) {
            throw new Error('Gemini Service not available');
        }
        
        try {
            const {
                userId = 'anonymous',
                conversationHistory = [],
                maxHistoryLength = 5
            } = options;
            
            console.log(`🤖 Generating RAG response for user: ${userId}`);
            console.log(`📝 Query: "${userQuery.substring(0, 100)}..."`);
            console.log(`📚 Context items: ${retrievedContext.length}`);
            
            // Build the prompt with retrieved context
            const prompt = this.buildRAGPrompt(userQuery, retrievedContext, conversationHistory, maxHistoryLength);
            
            console.log(`📄 Prompt length: ${prompt.length} characters`);
            
            // Generate response
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            if (!text || text.trim() === '') {
                throw new Error('Empty response from Gemini');
            }
            
            console.log(`✅ Response generated: ${text.length} characters`);
            
            // Analyze response confidence based on context usage
            const confidence = this.analyzeResponseConfidence(text, retrievedContext);
            
            return {
                response: text.trim(),
                confidence,
                contextUsed: retrievedContext.length,
                contextSources: retrievedContext.map(ctx => ({
                    question: ctx.question,
                    category: ctx.category,
                    score: ctx.score
                })),
                model: this.modelName,
                userId,
                timestamp: new Date().toISOString(),
                promptLength: prompt.length,
                responseLength: text.length
            };
            
        } catch (error) {
            console.error('❌ RAG response generation failed:', error.message);
            throw error;
        }
    }
    
    // Build RAG prompt with context and conversation history
    buildRAGPrompt(userQuery, retrievedContext, conversationHistory = [], maxHistoryLength = 5) {
        // Limit conversation history
        const recentHistory = conversationHistory.slice(-maxHistoryLength);
        
        // Build context section
        let contextSection = '';
        if (retrievedContext.length > 0) {
            contextSection = `RELEVANT FAQ CONTEXT:\n`;
            retrievedContext.forEach((ctx, index) => {
                contextSection += `${index + 1}. Q: ${ctx.question}\n   A: ${ctx.answer}\n   Category: ${ctx.category}\n   Relevance: ${(ctx.score * 100).toFixed(1)}%\n\n`;
            });
        }
        
        // Build conversation history section
        let historySection = '';
        if (recentHistory.length > 0) {
            historySection = `RECENT CONVERSATION:\n`;
            recentHistory.forEach((msg, index) => {
                historySection += `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}\n`;
            });
            historySection += '\n';
        }
        
        // Build the complete prompt
        const prompt = `You are a helpful ecommerce customer support assistant. Your goal is to provide accurate, helpful, and friendly responses to customer inquiries.

INSTRUCTIONS:
1. Use the provided FAQ context to answer the customer's question accurately
2. If the context contains highly relevant information (>85% relevance), use it directly
3. If the context is moderately relevant (75-85%), use it as guidance but adapt your response
4. If no relevant context is found, politely explain that you need more information or suggest contacting support
5. Always be polite, professional, and customer-focused
6. Keep responses concise but complete
7. If asked about specific policies, prices, or technical details not in the context, direct them to contact support

${contextSection}${historySection}CUSTOMER QUESTION: ${userQuery}

RESPONSE:`;

        return prompt;
    }
    
    // Analyze response confidence based on context usage
    analyzeResponseConfidence(response, retrievedContext) {
        if (retrievedContext.length === 0) {
            return {
                level: 'low',
                score: 0.3,
                reason: 'No relevant context found'
            };
        }
        
        const highConfidenceContext = retrievedContext.filter(ctx => ctx.score >= 0.85);
        const mediumConfidenceContext = retrievedContext.filter(ctx => ctx.score >= 0.75 && ctx.score < 0.85);
        
        if (highConfidenceContext.length > 0) {
            return {
                level: 'high',
                score: 0.9,
                reason: `Found ${highConfidenceContext.length} high-confidence matches`
            };
        } else if (mediumConfidenceContext.length > 0) {
            return {
                level: 'medium',
                score: 0.7,
                reason: `Found ${mediumConfidenceContext.length} medium-confidence matches`
            };
        } else {
            return {
                level: 'low',
                score: 0.5,
                reason: 'Only low-confidence matches found'
            };
        }
    }
    
    // Generate a simple response without RAG context
    async generateSimpleResponse(userQuery, options = {}) {
        if (!this.isServiceAvailable()) {
            throw new Error('Gemini Service not available');
        }
        
        try {
            const {
                systemPrompt = 'You are a helpful customer support assistant.',
                temperature = 0.7
            } = options;
            
            const prompt = `${systemPrompt}\n\nCustomer: ${userQuery}\n\nAssistant:`;
            
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            
            return {
                response: text.trim(),
                model: this.modelName,
                timestamp: new Date().toISOString(),
                type: 'simple'
            };
            
        } catch (error) {
            console.error('❌ Simple response generation failed:', error.message);
            throw error;
        }
    }
    
    // Test the service with a simple query
    async testService() {
        if (!this.isServiceAvailable()) {
            return {
                success: false,
                error: 'Service not available'
            };
        }
        
        try {
            const testQuery = 'Hello, can you help me?';
            const result = await this.generateSimpleResponse(testQuery, {
                systemPrompt: 'You are a test assistant. Respond briefly that you are working correctly.'
            });
            
            return {
                success: true,
                response: result.response,
                model: this.modelName
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get service statistics
    getStats() {
        return {
            available: this.isServiceAvailable(),
            model: this.modelName,
            maxContextLength: this.maxContextLength,
            apiKeyConfigured: !!process.env.GOOGLE_API_KEY
        };
    }
}

// Create singleton instance
const geminiService = new GeminiService();

module.exports = geminiService;