const mongoDBService = require('./mongodb.service');

async function createVectorIndex() {
    console.log('🔧 Creating Vector Search Index in MongoDB Atlas...\n');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        if (!mongoDBService.isAvailable()) {
            console.log('❌ MongoDB not available');
            return;
        }
        
        const collection = mongoDBService.faqCollection;
        
        console.log('📊 Current collection info:');
        const stats = await mongoDBService.getStats();
        console.log(`   Database: ${stats.database}`);
        console.log(`   Collection: ${stats.collection}`);
        console.log(`   Documents: ${stats.totalDocuments}`);
        console.log(`   Sample embedding dimensions: ${stats.sampleDocument.embeddingDimensions}`);
        
        // Check existing indexes
        console.log('\n🔍 Checking existing indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(idx => idx.name));
        
        const vectorIndexExists = indexes.some(idx => idx.name === 'vector_search_index');
        
        if (vectorIndexExists) {
            console.log('✅ Vector search index already exists!');
            return;
        }
        
        console.log('\n⚠️  Vector search index creation requires MongoDB Atlas UI');
        console.log('📋 Please follow these steps:');
        console.log('');
        console.log('1. Go to MongoDB Atlas Dashboard');
        console.log('2. Navigate to your cluster → Search');
        console.log('3. Click "Create Search Index"');
        console.log('4. Choose "Atlas Vector Search"');
        console.log('5. Configure:');
        console.log('   - Database: ecommerce_faq');
        console.log('   - Collection: faq_knowledge_base');
        console.log('   - Index Name: vector_search_index');
        console.log('');
        console.log('6. Use this JSON definition:');
        console.log('```json');
        console.log(JSON.stringify({
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768,
                    "similarity": "cosine"
                }
            ]
        }, null, 2));
        console.log('```');
        console.log('');
        console.log('7. Click "Create Search Index"');
        console.log('8. Wait 2-5 minutes for index to build');
        console.log('');
        console.log('🎯 Once created, your semantic search will work perfectly!');
        
        // Test a sample document to verify embedding structure
        console.log('\n🧪 Verifying embedding structure...');
        const sampleDoc = await collection.findOne({});
        if (sampleDoc && sampleDoc.embedding) {
            console.log('✅ Sample document has embedding');
            console.log(`✅ Embedding dimensions: ${sampleDoc.embedding.length}`);
            console.log(`✅ Embedding type: ${typeof sampleDoc.embedding[0]}`);
            console.log('✅ Ready for vector search index creation');
        } else {
            console.log('❌ No embedding found in sample document');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createVectorIndex();