const bcrypt = require('bcryptjs');
const mongoDBService = require('./mongodb.service');

class UserService {
    constructor() {
        this.collectionName = 'users';
        this.isInitialized = false;
        this.initializeService();
    }
    
    async initializeService() {
        try {
            console.log('🔄 Initializing User Service...');
            
            // Wait for MongoDB to be available (with timeout)
            let retries = 0;
            const maxRetries = 15; // 15 seconds total wait
            const retryDelay = 1000; // 1 second
            
            while (!mongoDBService.isAvailable() && retries < maxRetries) {
                console.log(`⏳ Waiting for MongoDB connection... (${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retries++;
            }
            
            if (!mongoDBService.isAvailable()) {
                console.log('⚠️ MongoDB not available after 15 seconds, user service will use fallback storage');
                this.isInitialized = false;
                return;
            }
            
            // Ensure indexes for performance and uniqueness
            await this.createIndexes();
            this.isInitialized = true;
            console.log('✅ User Service initialized with MongoDB storage');
            
        } catch (error) {
            console.error('❌ Failed to initialize User Service:', error.message);
            this.isInitialized = false;
        }
    }
    
    async createIndexes() {
        try {
            const collection = mongoDBService.db.collection(this.collectionName);
            
            // Unique index on email
            await collection.createIndex({ email: 1 }, { unique: true });
            
            // Index on userId for faster lookups
            await collection.createIndex({ userId: 1 }, { unique: true });
            
            // Index on createdAt for sorting
            await collection.createIndex({ createdAt: 1 });
            
            // Index on isActive for filtering
            await collection.createIndex({ isActive: 1 });
            
            console.log('✅ User collection indexes created');
            
        } catch (error) {
            console.error('❌ Failed to create user indexes:', error.message);
        }
    }
    
    isAvailable() {
        return this.isInitialized && mongoDBService.isAvailable();
    }
    
    // ==================== USER REGISTRATION ====================
    
    async createUser(userData) {
        try {
            const { email, password, name } = userData;
            
            // Validate input
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }
            
            if (!this.validatePassword(password)) {
                throw new Error('Password must be at least 8 characters long');
            }
            
            // Wait for MongoDB to be available (with timeout)
            let retries = 0;
            const maxRetries = 10;
            const retryDelay = 1000; // 1 second
            
            while (!mongoDBService.isAvailable() && retries < maxRetries) {
                console.log(`⏳ Waiting for MongoDB connection... (attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retries++;
            }
            
            if (!mongoDBService.isAvailable()) {
                throw new Error('Database connection timeout - MongoDB not available after 10 seconds');
            }
            
            // Check if user already exists
            const existingUser = await this.findUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists');
            }
            
            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Create user object
            const userId = this.generateUserId();
            const user = {
                userId,
                email: email.toLowerCase().trim(),
                name: name || email.split('@')[0],
                password: hashedPassword,
                isActive: true,
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: null,
                loginCount: 0,
                profile: {
                    avatar: null,
                    bio: null,
                    preferences: {
                        notifications: true,
                        theme: 'light',
                        language: 'en'
                    }
                },
                metadata: {
                    registrationIP: null,
                    userAgent: null,
                    source: 'api'
                }
            };
            
            // Store in MongoDB
            const collection = mongoDBService.db.collection(this.collectionName);
            const result = await collection.insertOne(user);
            
            if (!result.insertedId) {
                throw new Error('Failed to create user in database');
            }
            
            console.log(`✅ User created in MongoDB: ${email}`);
            
            // Return user without password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
            
        } catch (error) {
            console.error('❌ Failed to create user:', error.message);
            
            // Provide more specific error messages
            if (error.message.includes('timeout')) {
                throw new Error('Database connection timeout - please try again in a moment');
            }
            
            if (error.message.includes('already exists')) {
                throw error; // Re-throw as is
            }
            
            if (error.message.includes('Invalid') || error.message.includes('required')) {
                throw error; // Re-throw validation errors as is
            }
            
            // For database connection issues
            if (error.message.includes('not available') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Database not available - please check your MongoDB connection');
            }
            
            throw error;
        }
    }
    
    // ==================== USER AUTHENTICATION ====================
    
    async authenticateUser(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Find user by email
            const user = await this.findUserByEmail(email);
            if (!user) {
                throw new Error('Invalid credentials');
            }
            
            // Check if user is active
            if (!user.isActive) {
                throw new Error('Account is deactivated');
            }
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }
            
            // Update login statistics
            await this.updateLoginStats(user.userId);
            
            console.log(`✅ User authenticated: ${email}`);
            
            // Return user without password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            throw error;
        }
    }
    
    // ==================== USER RETRIEVAL ====================
    
    async findUserByEmail(email) {
        try {
            if (!email) return null;
            
            if (this.isAvailable()) {
                const collection = mongoDBService.db.collection(this.collectionName);
                const user = await collection.findOne({ 
                    email: email.toLowerCase().trim() 
                });
                return user;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Failed to find user by email:', error.message);
            return null;
        }
    }
    
    async findUserById(userId) {
        try {
            if (!userId) return null;
            
            if (this.isAvailable()) {
                const collection = mongoDBService.db.collection(this.collectionName);
                const user = await collection.findOne({ userId });
                return user;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Failed to find user by ID:', error.message);
            return null;
        }
    }
    
    async getUserProfile(userId) {
        try {
            const user = await this.findUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Return user profile without sensitive data
            return {
                userId: user.userId,
                email: user.email,
                name: user.name,
                isActive: user.isActive,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
                loginCount: user.loginCount,
                profile: user.profile
            };
            
        } catch (error) {
            console.error('❌ Failed to get user profile:', error.message);
            throw error;
        }
    }
    
    // ==================== USER UPDATES ====================
    
    async updateUser(userId, updateData) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            // Prepare update object
            const update = {
                ...updateData,
                updatedAt: new Date()
            };
            
            // Remove sensitive fields that shouldn't be updated directly
            delete update.password;
            delete update.userId;
            delete update.createdAt;
            
            if (this.isAvailable()) {
                const collection = mongoDBService.db.collection(this.collectionName);
                const result = await collection.updateOne(
                    { userId },
                    { $set: update }
                );
                
                if (result.matchedCount === 0) {
                    throw new Error('User not found');
                }
                
                console.log(`✅ User updated: ${userId}`);
                return await this.findUserById(userId);
            }
            
            throw new Error('Database not available');
            
        } catch (error) {
            console.error('❌ Failed to update user:', error.message);
            throw error;
        }
    }
    
    async updatePassword(userId, currentPassword, newPassword) {
        try {
            if (!userId || !currentPassword || !newPassword) {
                throw new Error('User ID, current password, and new password are required');
            }
            
            // Find user
            const user = await this.findUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            
            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }
            
            // Validate new password
            if (!this.validatePassword(newPassword)) {
                throw new Error('New password must be at least 8 characters long');
            }
            
            // Hash new password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            if (this.isAvailable()) {
                const collection = mongoDBService.db.collection(this.collectionName);
                await collection.updateOne(
                    { userId },
                    { 
                        $set: { 
                            password: hashedPassword,
                            updatedAt: new Date()
                        }
                    }
                );
                
                console.log(`✅ Password updated for user: ${userId}`);
                return true;
            }
            
            throw new Error('Database not available');
            
        } catch (error) {
            console.error('❌ Failed to update password:', error.message);
            throw error;
        }
    }
    
    async updateLoginStats(userId) {
        try {
            if (!this.isAvailable()) return;
            
            const collection = mongoDBService.db.collection(this.collectionName);
            await collection.updateOne(
                { userId },
                { 
                    $set: { 
                        lastLoginAt: new Date(),
                        updatedAt: new Date()
                    },
                    $inc: { loginCount: 1 }
                }
            );
            
        } catch (error) {
            console.error('❌ Failed to update login stats:', error.message);
        }
    }
    
    // ==================== USER MANAGEMENT ====================
    
    async deactivateUser(userId) {
        try {
            return await this.updateUser(userId, { isActive: false });
        } catch (error) {
            console.error('❌ Failed to deactivate user:', error.message);
            throw error;
        }
    }
    
    async activateUser(userId) {
        try {
            return await this.updateUser(userId, { isActive: true });
        } catch (error) {
            console.error('❌ Failed to activate user:', error.message);
            throw error;
        }
    }
    
    async deleteUser(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            if (this.isAvailable()) {
                const collection = mongoDBService.db.collection(this.collectionName);
                const result = await collection.deleteOne({ userId });
                
                if (result.deletedCount === 0) {
                    throw new Error('User not found');
                }
                
                console.log(`✅ User deleted: ${userId}`);
                return true;
            }
            
            throw new Error('Database not available');
            
        } catch (error) {
            console.error('❌ Failed to delete user:', error.message);
            throw error;
        }
    }
    
    // ==================== USER LISTING ====================
    
    async listUsers(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = -1,
                filter = {}
            } = options;
            
            if (!this.isAvailable()) {
                throw new Error('Database not available');
            }
            
            const collection = mongoDBService.db.collection(this.collectionName);
            
            // Build query
            const query = { ...filter };
            
            // Get total count
            const total = await collection.countDocuments(query);
            
            // Get users with pagination
            const users = await collection
                .find(query, { 
                    projection: { 
                        password: 0 // Exclude password from results
                    }
                })
                .sort({ [sortBy]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray();
            
            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to list users:', error.message);
            throw error;
        }
    }
    
    // ==================== UTILITY METHODS ====================
    
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    validatePassword(password) {
        return password && password.length >= 8;
    }
    
    // ==================== STATISTICS ====================
    
    async getUserStats() {
        try {
            if (!this.isAvailable()) {
                return null;
            }
            
            const collection = mongoDBService.db.collection(this.collectionName);
            
            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        activeUsers: {
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                        },
                        verifiedUsers: {
                            $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] }
                        },
                        avgLoginCount: { $avg: '$loginCount' }
                    }
                }
            ]).toArray();
            
            const result = stats[0] || {
                totalUsers: 0,
                activeUsers: 0,
                verifiedUsers: 0,
                avgLoginCount: 0
            };
            
            // Get recent registrations (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const recentUsers = await collection.countDocuments({
                createdAt: { $gte: weekAgo }
            });
            
            return {
                ...result,
                recentRegistrations: recentUsers,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Failed to get user stats:', error.message);
            return null;
        }
    }
}

// Create singleton instance
const userService = new UserService();

module.exports = userService;