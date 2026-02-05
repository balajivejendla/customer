const mongoDBService = require('./mongodb.service');

async function testMongoDBDirect() {
    console.log('🧪 Testing MongoDB Direct Access...\n');
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        if (!mongoDBService.isAvailable()) {
            console.log('❌ MongoDB not available');
            return;
        }
        
        // Get collection stats
        const stats = await mongoDBService.getStats();
        console.log('📊 Collection Stats:', {
            totalDocuments: stats.totalDocuments,
            categories: stats.categories,
            hasVectorIndex: stats.hasVectorIndex,
            sampleDocument: stats.sampleDocument
        });
        
        // Try to get a few sample documents
        console.log('\n📚 Sample FAQ Documents:');
        const collection = mongoDBService.faqCollection;
        const samples = await collection.find({}).limit(3).toArray();
        
        samples.forEach((doc, index) => {
            console.log(`\n${index + 1}. Question: "${doc.question}"`);
            console.log(`   Answer: "${doc.answer.substring(0, 100)}..."`);
            console.log(`   Category: ${doc.category}`);
            console.log(`   Has Embedding: ${!!doc.embedding}`);
            console.log(`   Embedding Dimensions: ${doc.embedding ? doc.embedding.length : 0}`);
        });
        
        // Test text search (fallback)
        console.log('\n🔍 Testing Text Search (Fallback):');
        const textResults = await collection.find({
            $text: { $search: "shipping" }
        }).limit(3).toArray();
        
        console.log(`Found ${textResults.length} results for "shipping":`);
        textResults.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.question} (${doc.category})`);
        });
        
        // Check if vector search index exists
        console.log('\n🔍 Checking Vector Search Index:');
        const indexes = await collection.indexes();
        const vectorIndex = indexes.find(idx => idx.name === 'vector_search_index');
        
        if (vectorIndex) {
            console.log('✅ Vector search index found:', vectorIndex);
        } else {
            console.log('❌ Vector search index NOT found');
            console.log('💡 You need to create a vector search index in MongoDB Atlas');
            console.log('📋 Available indexes:', indexes.map(idx => idx.name));
        }
        
        console.log('\n🎯 Summary:');
        console.log(`✅ MongoDB connected with ${stats.totalDocuments} FAQ documents`);
        console.log(`✅ Embeddings present (${stats.sampleDocument.embeddingDimensions} dimensions)`);
        console.log(`✅ Categories: ${stats.categories.join(', ')}`);
        console.log(`${vectorIndex ? '✅' : '❌'} Vector search index ${vectorIndex ? 'exists' : 'missing'}`);
        
        if (!vectorIndex) {
            console.log('\n💡 To fix vector search:');
            console.log('   1. Go to MongoDB Atlas dashboard');
            console.log('   2. Navigate to your cluster > Search');
            console.log('   3. Create a new search index');
            console.log('   4. Use "Vector Search" type');
            console.log('   5. Set field path to "embedding"');
            console.log('   6. Set dimensions to 768');
            console.log('   7. Name it "vector_search_index"');
        }
        
    } catch (error) {
        console.error('❌ MongoDB test failed:', error.message);
    }
}

testMongoDBDirect();