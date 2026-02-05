#!/usr/bin/env node
/**
 * Test Gemini API Connection
 */

require('dotenv').config();
const geminiService = require('./gemini.service');
const embeddingService = require('./embedding.service');

async function testGeminiAPI() {
    console.log('🧪 Testing Gemini API Connection');
    console.log('=================================\n');
    
    console.log('Environment variables:');
    console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET' : 'NOT SET');
    console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);
    console.log('GOOGLE_EMBEDDING_MODEL:', process.env.GOOGLE_EMBEDDING_MODEL);
    
    // Test Gemini Service
    console.log('\n🤖 Testing Gemini Service...');
    const geminiStats = geminiService.getStats();
    console.log('Gemini Stats:', geminiStats);
    
    if (geminiStats.available) {
        console.log('✅ Gemini service is available!');
        
        try {
            const testResult = await geminiService.testService();
            console.log('🧪 Test Result:', testResult);
        } catch (error) {
            console.log('❌ Gemini test failed:', error.message);
        }
    } else {
        console.log('❌ Gemini service is not available');
    }
    
    // Test Embedding Service
    console.log('\n🧠 Testing Embedding Service...');
    const embeddingStats = embeddingService.getStats();
    console.log('Embedding Stats:', embeddingStats);
    
    if (embeddingStats.available) {
        console.log('✅ Embedding service is available!');
        
        try {
            const testEmbedding = await embeddingService.generateEmbedding('What is your return policy?');
            console.log('🧪 Test Embedding:', {
                dimensions: testEmbedding.dimensions,
                model: testEmbedding.model,
                provider: testEmbedding.provider,
                sampleValues: testEmbedding.embedding.slice(0, 5)
            });
        } catch (error) {
            console.log('❌ Embedding test failed:', error.message);
        }
    } else {
        console.log('❌ Embedding service is not available');
    }
}

testGeminiAPI().catch(console.error);