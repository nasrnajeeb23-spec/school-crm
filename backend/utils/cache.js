const redis = require('redis');

// Redis client configuration
let redisClient = null;
let isConnected = false;
const memoryStore = new Map();
const memoryExpiry = new Map();

// Initialize Redis client
const initRedis = async () => {
    if (redisClient && isConnected) {
        return redisClient;
    }

    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        redisClient = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Redis: Too many reconnection attempts');
                        return new Error('Too many reconnection attempts');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
            isConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('Redis: Connected successfully');
            isConnected = true;
        });

        redisClient.on('disconnect', () => {
            console.log('Redis: Disconnected');
            isConnected = false;
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.error('Redis initialization error:', error);
        return null;
    }
};

// Get Redis client
const getRedisClient = () => {
    if (!redisClient || !isConnected) {
        console.warn('Redis client not initialized or not connected');
        return null;
    }
    return redisClient;
};

// Cache utilities
const cache = {
    // Get value from cache
    get: async (key) => {
        try {
            const client = getRedisClient();
            if (!client) {
                const exp = memoryExpiry.get(key);
                if (exp && Date.now() > exp) {
                    memoryStore.delete(key);
                    memoryExpiry.delete(key);
                    return null;
                }
                return memoryStore.has(key) ? memoryStore.get(key) : null;
            }

            const value = await client.get(key);
            if (!value) return null;

            return JSON.parse(value);
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    },

    // Set value in cache
    set: async (key, value, ttl = 3600) => {
        try {
            const client = getRedisClient();
            if (!client) {
                memoryStore.set(key, value);
                memoryExpiry.set(key, Date.now() + (Number(ttl) * 1000));
                return true;
            }

            await client.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    },

    // Delete key from cache
    del: async (key) => {
        try {
            const client = getRedisClient();
            if (!client) {
                memoryStore.delete(key);
                memoryExpiry.delete(key);
                return true;
            }

            await client.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    },

    // Delete multiple keys matching pattern
    delPattern: async (pattern) => {
        try {
            const client = getRedisClient();
            if (!client) {
                const regex = new RegExp('^' + String(pattern).replace(/\*/g, '.*') + '$');
                for (const k of Array.from(memoryStore.keys())) {
                    if (regex.test(k)) {
                        memoryStore.delete(k);
                        memoryExpiry.delete(k);
                    }
                }
                return true;
            }

            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
            return true;
        } catch (error) {
            console.error('Cache delete pattern error:', error);
            return false;
        }
    },

    // Check if key exists
    exists: async (key) => {
        try {
            const client = getRedisClient();
            if (!client) {
                const exp = memoryExpiry.get(key);
                if (exp && Date.now() > exp) {
                    memoryStore.delete(key);
                    memoryExpiry.delete(key);
                    return false;
                }
                return memoryStore.has(key);
            }

            return await client.exists(key) === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    },

    // Get remaining TTL
    ttl: async (key) => {
        try {
            const client = getRedisClient();
            if (!client) {
                const exp = memoryExpiry.get(key);
                if (!exp) return -1;
                const rem = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
                return rem;
            }

            return await client.ttl(key);
        } catch (error) {
            console.error('Cache TTL error:', error);
            return -1;
        }
    },

    // Increment value
    incr: async (key) => {
        try {
            const client = getRedisClient();
            if (!client) {
                const cur = memoryStore.has(key) ? memoryStore.get(key) : 0;
                const next = Number(cur) + 1;
                memoryStore.set(key, next);
                return next;
            }

            return await client.incr(key);
        } catch (error) {
            console.error('Cache increment error:', error);
            return null;
        }
    },

    // Set with expiry at specific time
    expireAt: async (key, timestamp) => {
        try {
            const client = getRedisClient();
            if (!client) {
                memoryExpiry.set(key, Number(timestamp) * 1000);
                return true;
            }

            await client.expireAt(key, timestamp);
            return true;
        } catch (error) {
            console.error('Cache expireAt error:', error);
            return false;
        }
    }
};

// Cache key generators
const cacheKeys = {
    schools: () => 'schools:all',
    school: (id) => `school:${id}`,
    schoolStats: (id) => `school:${id}:stats`,
    dashboardStats: () => 'dashboard:stats',
    teamMembers: () => 'team:members',
    subscriptions: () => 'subscriptions:all',
    subscription: (id) => `subscription:${id}`,
    user: (id) => `user:${id}`,
    messages: () => 'messages:all'
};

// Close Redis connection
const closeRedis = async () => {
    if (redisClient && isConnected) {
        await redisClient.quit();
        isConnected = false;
        redisClient = null;
    }
};

module.exports = {
    initRedis,
    getRedisClient,
    cache,
    cacheKeys,
    closeRedis
};
