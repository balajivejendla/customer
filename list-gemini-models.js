const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listGeminiModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        console.log('🔍 Listing available Gemini models...\n');
        
        const models = await genAI.listModels();
        
        console.log('📋 Available Models:');
        models.forEach((model, index) => {
            console.log(`${index + 1}. ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Description: ${model.description}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            console.log('');
        });
        
        // Find the best model for text generation
        const textModels = models.filter(model => 
            model.supportedGenerationMethods?.includes('generateContent')
        );
        
        console.log('🎯 Recommended models for text generation:');
        textModels.forEach((model, index) => {
            console.log(`${index + 1}. ${model.name} - ${model.displayName}`);
        });
        
    } catch (error) {
        console.error('❌ Error listing models:', error.message);
    }
}

listGeminiModels();