#!/usr/bin/env node
/**
 * Direct FAQ Test - Test the FAQ system without WebSocket
 */

const simpleFAQService = require('./simple-faq.service');

async function testFAQDirect() {
    console.log('🧪 Testing FAQ System Directly');
    console.log('===============================\n');
    
    // Wait for FAQ service to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test the exact question you mentioned
    const testQueries = [
        "What is your return policy?",
        "How long does shipping take?",
        "What payment methods do you accept?",
        "How do I cancel my order?",
        "return policy",
        "shipping time",
        "payment"
    ];
    
    for (const query of testQueries) {
        console.log(`\n❓ Testing: "${query}"`);
        console.log('─'.repeat(50));
        
        const match = simpleFAQService.findBestMatch(query);
        
        if (match) {
            console.log(`✅ FOUND MATCH!`);
            console.log(`📊 Confidence: ${match.confidence} (${(match.score * 100).toFixed(1)}%)`);
            console.log(`🏷️  Category: ${match.category}`);
            console.log(`❓ Source Question: ${match.source}`);
            console.log(`💬 Answer: ${match.answer}`);
        } else {
            console.log(`❌ No match found`);
        }
    }
    
    console.log('\n🎯 FAQ System Test Results:');
    console.log('============================');
    
    const stats = simpleFAQService.getStats();
    console.log(`📚 Total FAQs loaded: ${stats.totalFAQs}`);
    console.log(`📂 Categories: ${stats.categories.join(', ')}`);
    console.log(`🔍 Search type: ${stats.type}`);
    
    // Test the specific question from your issue
    console.log('\n🎯 SPECIFIC TEST: "What is your return policy?"');
    console.log('================================================');
    
    const returnPolicyMatch = simpleFAQService.findBestMatch("What is your return policy?");
    
    if (returnPolicyMatch) {
        console.log('✅ SUCCESS! The FAQ system found the return policy!');
        console.log(`📝 Full Answer: ${returnPolicyMatch.answer}`);
        console.log('\n🎉 Your FAQ system is working correctly!');
        console.log('💡 The issue was that it needed to be properly integrated.');
    } else {
        console.log('❌ FAILED! Could not find return policy.');
    }
}

testFAQDirect().catch(console.error);