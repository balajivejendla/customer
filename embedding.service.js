const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config();

class EmbeddingService {
    constructor() {
        this.genAI = null;
        this.isAvailable = false;
        this.model = process.env.GOOGLE_EMBEDDING_MODEL || 'text-embedding-004';
        this.dimensions = parseInt(process.env.GOOGLE_EMBEDDING_DIMENSIONS) || 768;
        
        this.initialize();
    }
    
    initialize() {
        try {
            if (!process.env.GOOGLE_API_KEY) {
                console.log('⚠️  Google API key not provided. Embedding service disabled.');
                return;
            }
            
            this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
            
            this.isAvailable = true;
            console.log('✅ Google Gemini Embedding Service initialized');
            console.log(`📊 Model: ${this.model}`);
            console.log(`📏 Dimensions: ${this.dimensions}`);
            
        } catch (error) {
            console.error('❌ Google Gemini Embedding Service initialization failed:', error.message);
            this.isAvailable = false;
        }
    }
    
    // Check if service is available
    isServiceAvailable() {
        return this.isAvailable && this.genAI;
    }
    
    // Generate embedding for a single text
    async generateEmbedding(text, options = {}) {
        if (!this.isServiceAvailable()) {
            throw new Error('Google Gemini Embedding Service not available');
        }
        
        try {
            const {
                category = null,
                includeCategory = true
            } = options;
            
            // Prepare input text with optional category augmentation
            let inputText = text.trim();
            if (category && includeCategory) {
                inputText = `${category}: ${inputText}`;
            }
            
            console.log(`🔄 Generating Google embedding for: "${inputText.substring(0, 100)}..."`);
            
            // Use Google's embedding model
            const model = this.genAI.getGenerativeModel({ model: this.model });
            
            const result = await model.embedContent(inputText);
            
            if (!result.embedding || !result.embedding.values) {
                throw new Error('No embedding data received from Google Gemini');
            }
            
            const embedding = result.embedding.values;
            
            console.log(`✅ Google embedding generated: ${embedding.length} dimensions`);
            
            return {
                embedding,
                inputText,
                originalText: text,
                category,
                dimensions: embedding.length,
                model: this.model,
                provider: 'google'
            };
            
        } catch (error) {
            console.error('❌ Google embedding generation failed:', error.message);
            throw error;
        }
    }
    
    // Generate embeddings for multiple texts (batch processing)
    async generateBatchEmbeddings(texts, options = {}) {
        if (!this.isServiceAvailable()) {
            throw new Error('Google Gemini Embedding Service not available');
        }
        
        try {
            const {
                batchSize = 10, // Google has stricter rate limits
                includeCategory = true,
                delayBetweenBatches = 1000 // 1 second delay between batches
            } = options;
            
            const results = [];
            const totalTexts = texts.length;
            
            console.log(`🔄 Generating Google embeddings for ${totalTexts} texts in batches of ${batchSize}`);
            
            // Process in smaller batches due to Google rate limits
            for (let i = 0; i < totalTexts; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(totalTexts / batchSize);
                
                console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
                
                // Process each item in the batch sequentially to respect rate limits
                for (let j = 0; j < batch.length; j++) {
                    const originalItem = batch[j];
                    const text = typeof originalItem === 'string' ? originalItem : originalItem.text || originalItem.question;
                    const category = typeof originalItem === 'object' ? originalItem.category : null;
                    
                    try {
                        const embeddingResult = await this.generateEmbedding(text, { 
                            category, 
                            includeCategory 
                        });
                        
                        results.push({
                            embedding: embeddingResult.embedding,
                            inputText: embeddingResult.inputText,
                            originalText: text,
                            originalItem: originalItem,
                            category: category,
                            dimensions: embeddingResult.dimensions,
                            index: i + j,
                            provider: 'google'
                        });
                        
                        // Small delay between individual requests
                        if (j < batch.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                        
                    } catch (error) {
                        console.error(`❌ Failed to generate embedding for item ${i + j}:`, error.message);
                        // Continue with other items
                    }
                }
                
                console.log(`✅ Batch ${batchNumber}/${totalBatches} completed`);
                
                // Add delay between batches to respect rate limits
                if (i + batchSize < totalTexts) {
                    console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                }
            }
            
            console.log(`🎉 All Google embeddings generated: ${results.length} total`);
            
            return {
                embeddings: results,
                totalProcessed: results.length,
                model: this.model,
                dimensions: this.dimensions,
                batchSize: batchSize,
                provider: 'google'
            };
            
        } catch (error) {
            console.error('❌ Batch Google embedding generation failed:', error.message);
            throw error;
        }
    }
    
    // Calculate cosine similarity between two embeddings
    calculateCosineSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
            throw new Error('Invalid embeddings for similarity calculation');
        }
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        
        const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        return similarity;
    }
    
    // Find most similar embeddings from a list
    findMostSimilar(queryEmbedding, candidateEmbeddings, options = {}) {
        const {
            topK = 3,
            threshold = 0.75
        } = options;
        
        const similarities = candidateEmbeddings.map((candidate, index) => ({
            index,
            similarity: this.calculateCosineSimilarity(queryEmbedding, candidate.embedding),
            data: candidate
        }));
        
        // Filter by threshold and sort by similarity
        const filtered = similarities
            .filter(item => item.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
        
        return filtered;
    }
    
    // Get service statistics
    getStats() {
        return {
            available: this.isServiceAvailable(),
            model: this.model,
            dimensions: this.dimensions,
            provider: 'google',
            apiKeyConfigured: !!process.env.GOOGLE_API_KEY
        };
    }
}

// Create singleton instance
const embeddingService = new EmbeddingService();

module.exports = embeddingService;