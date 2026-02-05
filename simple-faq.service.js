const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

class SimpleFAQService {
    constructor() {
        this.faqs = [];
        this.isLoaded = false;
        this.loadFAQs();
    }
    
    async loadFAQs() {
        try {
            // Try to find FAQ file in various locations
            const possiblePaths = [
                './customer_support_faq.json',
                '../customer_support_faq.json',
                'C:/Users/balaj/OneDrive/Desktop/MCP/customer_support_faq.json',
                './data/customer_support_faq.json'
            ];
            
            let faqData = null;
            let foundPath = null;
            
            for (const filePath of possiblePaths) {
                try {
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    faqData = JSON.parse(fileContent);
                    foundPath = filePath;
                    break;
                } catch (error) {
                    // Continue searching
                }
            }
            
            if (!faqData) {
                // Use sample FAQ data
                console.log('📝 FAQ file not found, using sample data');
                faqData = this.getSampleFAQs();
            } else {
                console.log(`✅ FAQ data loaded from: ${foundPath}`);
            }
            
            // Normalize FAQ structure
            if (Array.isArray(faqData)) {
                this.faqs = faqData;
            } else if (faqData.faqs && Array.isArray(faqData.faqs)) {
                this.faqs = faqData.faqs;
            } else if (faqData.questions && Array.isArray(faqData.questions)) {
                this.faqs = faqData.questions;
            } else {
                this.faqs = this.getSampleFAQs();
            }
            
            this.isLoaded = true;
            console.log(`📚 Loaded ${this.faqs.length} FAQ items`);
            
        } catch (error) {
            console.error('❌ Error loading FAQ data:', error.message);
            this.faqs = this.getSampleFAQs();
            this.isLoaded = true;
        }
    }
    
    getSampleFAQs() {
        return [
            {
                question: "What is your return policy?",
                answer: "Our return policy allows you to return products within 30 days of purchase for a full refund, provided they are in their original condition and packaging. Please refer to our Returns page for detailed instructions.",
                category: "Returns"
            },
            {
                question: "How long does shipping take?",
                answer: "Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is available on orders over $50.",
                category: "Shipping"
            },
            {
                question: "How can I track my order?",
                answer: "You can track your order using the tracking number sent to your email. Visit our tracking page or use the tracking link in your confirmation email.",
                category: "Orders"
            },
            {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay.",
                category: "Payment"
            },
            {
                question: "How do I cancel my order?",
                answer: "Orders can be cancelled within 1 hour of placement. After that, please contact customer service. Shipped orders cannot be cancelled but can be returned.",
                category: "Orders"
            },
            {
                question: "Do you offer international shipping?",
                answer: "Yes, we ship to over 50 countries worldwide. International shipping takes 7-14 business days and costs vary by destination.",
                category: "Shipping"
            },
            {
                question: "Is my payment information secure?",
                answer: "Yes, we use SSL encryption and are PCI DSS compliant. We never store your full credit card information on our servers.",
                category: "Payment"
            },
            {
                question: "How do I create an account?",
                answer: "Click 'Sign Up' at the top of any page, enter your email and create a password. You can also sign up during checkout.",
                category: "Account"
            },
            {
                question: "I forgot my password, what should I do?",
                answer: "Click 'Forgot Password' on the login page, enter your email, and we'll send you a password reset link.",
                category: "Account"
            },
            {
                question: "How do I change my shipping address?",
                answer: "Log into your account, go to 'Address Book', and add or edit your shipping addresses. You can set a default address for faster checkout.",
                category: "Account"
            }
        ];
    }
    
    // Simple text similarity search
    searchFAQ(userQuery, threshold = 0.3) {
        if (!this.isLoaded) {
            return [];
        }
        
        const query = userQuery.toLowerCase();
        const results = [];
        
        for (const faq of this.faqs) {
            const questionWords = faq.question.toLowerCase().split(' ');
            const queryWords = query.split(' ');
            
            // Calculate simple word overlap score
            let matchCount = 0;
            for (const queryWord of queryWords) {
                if (queryWord.length > 2) { // Skip short words
                    for (const questionWord of questionWords) {
                        if (questionWord.includes(queryWord) || queryWord.includes(questionWord)) {
                            matchCount++;
                            break;
                        }
                    }
                }
            }
            
            const score = matchCount / Math.max(queryWords.length, questionWords.length);
            
            if (score >= threshold) {
                results.push({
                    ...faq,
                    score: score,
                    confidence: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'
                });
            }
        }
        
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, 3); // Return top 3 matches
    }
    
    // Find best matching FAQ
    findBestMatch(userQuery) {
        const results = this.searchFAQ(userQuery);
        
        if (results.length === 0) {
            return null;
        }
        
        const bestMatch = results[0];
        
        // Return high confidence matches directly
        if (bestMatch.score > 0.6) {
            return {
                answer: bestMatch.answer,
                confidence: bestMatch.confidence,
                source: bestMatch.question,
                category: bestMatch.category,
                score: bestMatch.score
            };
        }
        
        return null;
    }
    
    // Get all categories
    getCategories() {
        if (!this.isLoaded) return [];
        
        const categories = [...new Set(this.faqs.map(faq => faq.category))];
        return categories.filter(cat => cat && cat.trim() !== '');
    }
    
    // Get stats
    getStats() {
        return {
            loaded: this.isLoaded,
            totalFAQs: this.faqs.length,
            categories: this.getCategories(),
            type: 'simple_text_search'
        };
    }
}

// Create singleton instance
const simpleFAQService = new SimpleFAQService();

module.exports = simpleFAQService;