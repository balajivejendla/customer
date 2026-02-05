const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

class MongoDBService {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.faqCollection = null;
        
        // Configuration
        this.config = {
            uri: process.env.MONGODB_URI,
            dbName: process.env.MONGODB_DB_NAME || 'ecommerce_faq',
            collectionName: process.env.FAQ_COLLECTION_NAME || 'faq_knowledge_base',
            vectorIndexName: process.env.VECTOR_SEARCH_INDEX_NAME || 'vector_search_index'
        };
        
        this.connect();
    }
    
    async connect() {
        try {
            if (!this.config.uri) {
                console.log('⚠️  MongoDB URI not provided. Running without MongoDB.');
                return;
            }
            
            console.log('🔗 Connecting to MongoDB Atlas...');
            console.log(`📍 URI: ${this.config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
            console.log(`📚 Database: ${this.config.dbName}`);
            
            // Connect using native MongoDB driver for vector search
            this.client = new MongoClient(this.config.uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000, // Increased timeout
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                retryWrites: true,
                retryReads: true
            });
            
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
            this.faqCollection = this.db.collection(this.config.collectionName);
            
            // Test connection with admin ping
            await this.client.db('admin').command({ ping: 1 });
            
            // Test database access
            await this.db.command({ ping: 1 });
            
            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas successfully');
            console.log(`📚 Database: ${this.config.dbName}`);
            console.log(`📄 Collection: ${this.config.collectionName}`);
            
            // Initialize collection and indexes
            await this.initializeCollection();
            
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            
            // Provide specific error guidance
            if (error.message.includes('authentication failed')) {
                console.error('🔐 Authentication failed - check your MongoDB credentials');
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
                console.error('🌐 Network error - check your internet connection and MongoDB URI');
            } else if (error.message.includes('timeout')) {
                console.error('⏰ Connection timeout - MongoDB server may be unreachable');
            } else if (error.message.includes('IP')) {
                console.error('🚫 IP whitelist error - add your IP to MongoDB Atlas whitelist');
            }
            
            console.log('⚠️  Running without MongoDB. User registration will fail.');
            this.isConnected = false;
        }
    }
    
    async initializeCollection() {
        if (!this.isConnected) return;
        
        try {
            // Create collection if it doesn't exist
            const collections = await this.db.listCollections({ name: this.config.collectionName }).toArray();
            if (collections.length === 0) {
                await this.db.createCollection(this.config.collectionName);
                console.log(`✅ Created collection: ${this.config.collectionName}`);
            }
            
            // Create text index for traditional search fallback
            try {
                await this.faqCollection.createIndex(
                    { question: 'text', answer: 'text', category: 'text' },
                    { name: 'text_search_index' }
                );
                console.log('✅ Text search index created');
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.log('⚠️  Text index creation skipped:', error.message);
                }
            }
            
            // Check document count
            const count = await this.faqCollection.countDocuments();
            console.log(`📊 FAQ documents in collection: ${count}`);
            
            if (count === 0) {
                console.log('💡 Collection is empty. Use the seed script to populate with FAQ data.');
            }
            
        } catch (error) {
            console.error('❌ Collection initialization failed:', error.message);
        }
    }
    
    // Check if MongoDB is available
    isAvailable() {
        return this.isConnected && this.client && this.faqCollection;
    }
    
    // Insert FAQ document with embedding
    async insertFAQ(faqData) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const document = {
                question: faqData.question,
                answer: faqData.answer,
                category: faqData.category || 'General',
                embedding: faqData.embedding,
                created_at: new Date(),
                updated_at: new Date()
            };
            
            const result = await this.faqCollection.insertOne(document);
            console.log(`✅ FAQ inserted with ID: ${result.insertedId}`);
            return result;
            
        } catch (error) {
            console.error('❌ Error inserting FAQ:', error.message);
            throw error;
        }
    }
    
    // Bulk insert FAQ documents
    async insertManyFAQs(faqArray) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const documents = faqArray.map(faq => ({
                question: faq.question,
                answer: faq.answer,
                category: faq.category || 'General',
                embedding: faq.embedding,
                created_at: new Date(),
                updated_at: new Date()
            }));
            
            const result = await this.faqCollection.insertMany(documents);
            console.log(`✅ ${result.insertedCount} FAQs inserted successfully`);
            return result;
            
        } catch (error) {
            console.error('❌ Error bulk inserting FAQs:', error.message);
            throw error;
        }
    }
    
    // Vector search using MongoDB Atlas Vector Search
    async vectorSearch(queryEmbedding, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const {
                limit = parseInt(process.env.MAX_RETRIEVAL_RESULTS) || 3,
                threshold = parseFloat(process.env.SIMILARITY_THRESHOLD_LOW) || 0.75,
                category = null
            } = options;
            
            // Build aggregation pipeline for vector search
            const pipeline = [
                {
                    $vectorSearch: {
                        index: this.config.vectorIndexName,
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: limit * 10, // Search more candidates for better results
                        limit: limit
                    }
                },
                {
                    $addFields: {
                        score: { $meta: 'vectorSearchScore' }
                    }
                },
                {
                    $match: {
                        score: { $gte: threshold }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        question: 1,
                        answer: 1,
                        category: 1,
                        score: 1,
                        created_at: 1
                    }
                }
            ];
            
            // Add category filter if specified
            if (category) {
                pipeline.splice(3, 0, {
                    $match: { category: category }
                });
            }
            
            const results = await this.faqCollection.aggregate(pipeline).toArray();
            
            console.log(`🔍 Vector search found ${results.length} results (threshold: ${threshold})`);
            
            // Categorize results by confidence
            const categorizedResults = {
                highConfidence: results.filter(r => r.score >= (parseFloat(process.env.SIMILARITY_THRESHOLD_HIGH) || 0.85)),
                mediumConfidence: results.filter(r => r.score >= threshold && r.score < (parseFloat(process.env.SIMILARITY_THRESHOLD_HIGH) || 0.85)),
                lowConfidence: results.filter(r => r.score < threshold)
            };
            
            return {
                results,
                categorized: categorizedResults,
                totalFound: results.length,
                hasHighConfidence: categorizedResults.highConfidence.length > 0,
                hasMediumConfidence: categorizedResults.mediumConfidence.length > 0
            };
            
        } catch (error) {
            console.error('❌ Vector search failed:', error.message);
            
            // Fallback to text search if vector search fails
            console.log('🔄 Falling back to text search...');
            return await this.textSearchFallback(queryEmbedding, options);
        }
    }
    
    // Fallback text search when vector search is not available
    async textSearchFallback(query, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const {
                limit = parseInt(process.env.MAX_RETRIEVAL_RESULTS) || 3,
                category = null
            } = options;
            
            // Convert embedding back to text query (this is a simplified approach)
            // In practice, you'd store the original query text
            const searchQuery = typeof query === 'string' ? query : '';
            
            const pipeline = [
                {
                    $match: {
                        $and: [
                            { $text: { $search: searchQuery } },
                            category ? { category: category } : {}
                        ].filter(condition => Object.keys(condition).length > 0)
                    }
                },
                {
                    $addFields: {
                        score: { $meta: 'textScore' }
                    }
                },
                {
                    $sort: { score: { $meta: 'textScore' } }
                },
                {
                    $limit: limit
                },
                {
                    $project: {
                        _id: 1,
                        question: 1,
                        answer: 1,
                        category: 1,
                        score: 1,
                        created_at: 1
                    }
                }
            ];
            
            const results = await this.faqCollection.aggregate(pipeline).toArray();
            
            console.log(`📝 Text search fallback found ${results.length} results`);
            
            return {
                results,
                categorized: {
                    highConfidence: [],
                    mediumConfidence: results,
                    lowConfidence: []
                },
                totalFound: results.length,
                hasHighConfidence: false,
                hasMediumConfidence: results.length > 0,
                fallback: true
            };
            
        } catch (error) {
            console.error('❌ Text search fallback failed:', error.message);
            return {
                results: [],
                categorized: { highConfidence: [], mediumConfidence: [], lowConfidence: [] },
                totalFound: 0,
                hasHighConfidence: false,
                hasMediumConfidence: false,
                error: error.message
            };
        }
    }
    
    // Get FAQ by ID
    async getFAQById(id) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const result = await this.faqCollection.findOne({ _id: new require('mongodb').ObjectId(id) });
            return result;
        } catch (error) {
            console.error('❌ Error getting FAQ by ID:', error.message);
            throw error;
        }
    }
    
    // Update FAQ
    async updateFAQ(id, updateData) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const result = await this.faqCollection.updateOne(
                { _id: new require('mongodb').ObjectId(id) },
                { 
                    $set: {
                        ...updateData,
                        updated_at: new Date()
                    }
                }
            );
            
            console.log(`✅ FAQ updated: ${result.modifiedCount} document(s)`);
            return result;
            
        } catch (error) {
            console.error('❌ Error updating FAQ:', error.message);
            throw error;
        }
    }
    
    // Delete FAQ
    async deleteFAQ(id) {
        if (!this.isAvailable()) {
            throw new Error('MongoDB not available');
        }
        
        try {
            const result = await this.faqCollection.deleteOne({ _id: new require('mongodb').ObjectId(id) });
            console.log(`✅ FAQ deleted: ${result.deletedCount} document(s)`);
            return result;
            
        } catch (error) {
            console.error('❌ Error deleting FAQ:', error.message);
            throw error;
        }
    }
    
    // Get all categories
    async getCategories() {
        if (!this.isAvailable()) {
            return [];
        }
        
        try {
            const categories = await this.faqCollection.distinct('category');
            return categories.filter(cat => cat && cat.trim() !== '');
        } catch (error) {
            console.error('❌ Error getting categories:', error.message);
            return [];
        }
    }
    
    // Get collection statistics
    async getStats() {
        if (!this.isAvailable()) {
            return null;
        }
        
        try {
            const totalDocs = await this.faqCollection.countDocuments();
            const categories = await this.getCategories();
            const sampleDoc = await this.faqCollection.findOne();
            
            // Get index information
            const indexes = await this.faqCollection.indexes();
            
            return {
                connected: this.isConnected,
                database: this.config.dbName,
                collection: this.config.collectionName,
                totalDocuments: totalDocs,
                categories: categories,
                categoryCount: categories.length,
                hasVectorIndex: indexes.some(idx => idx.name === this.config.vectorIndexName),
                hasTextIndex: indexes.some(idx => idx.name === 'text_search_index'),
                sampleDocument: sampleDoc ? {
                    hasEmbedding: !!sampleDoc.embedding,
                    embeddingDimensions: sampleDoc.embedding ? sampleDoc.embedding.length : 0,
                    question: sampleDoc.question?.substring(0, 50) + '...',
                    category: sampleDoc.category
                } : null,
                indexes: indexes.map(idx => ({
                    name: idx.name,
                    keys: idx.key
                }))
            };
            
        } catch (error) {
            console.error('❌ Error getting stats:', error.message);
            return { error: error.message };
        }
    }
    
    // Close connection
    async disconnect() {
        if (this.client) {
            await this.client.close();
            console.log('👋 MongoDB connection closed');
            this.isConnected = false;
        }
    }
}

// Create singleton instance
const mongoDBService = new MongoDBService();

// Cleanup on process exit
process.on('SIGINT', async () => {
    await mongoDBService.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await mongoDBService.disconnect();
    process.exit(0);
});

module.exports = mongoDBService;