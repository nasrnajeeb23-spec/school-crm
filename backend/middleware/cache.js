const { cache, cacheKeys } = require('../utils/cache');

// Cache middleware factory
const cacheMiddleware = (options = {}) => {
    const {
        ttl = 3600, // Default 1 hour
        keyGenerator = (req) => req.originalUrl,
        condition = () => true,
        invalidateOn = []
    } = options;

    return async (req, res, next) => {
        // Skip caching if condition not met
        if (!condition(req)) {
            return next();
        }

        // Generate cache key
        const cacheKey = typeof keyGenerator === 'function'
            ? keyGenerator(req)
            : keyGenerator;

        try {
            // Try to get from cache
            const cachedData = await cache.get(cacheKey);

            if (cachedData) {
                console.log(`Cache HIT: ${cacheKey}`);
                return res.json(cachedData);
            }

            console.log(`Cache MISS: ${cacheKey}`);

            // Store original res.json
            const originalJson = res.json.bind(res);

            // Override res.json to cache the response
            res.json = function (data) {
                // Cache the response
                cache.set(cacheKey, data, ttl).catch(err => {
                    console.error('Error caching response:', err);
                });

                // Call original json method
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

// Invalidate cache middleware
const invalidateCache = (patterns) => {
    return async (req, res, next) => {
        try {
            const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

            for (const pattern of patternsArray) {
                const key = typeof pattern === 'function' ? pattern(req) : pattern;
                await cache.delPattern(key);
                console.log(`Cache invalidated: ${key}`);
            }
        } catch (error) {
            console.error('Cache invalidation error:', error);
        }

        next();
    };
};

// Specific cache middleware for common routes
const cacheMiddlewares = {
    // Cache schools list
    schools: cacheMiddleware({
        keyGenerator: () => cacheKeys.schools(),
        ttl: 300, // 5 minutes
        condition: (req) => req.method === 'GET'
    }),

    // Cache single school
    school: cacheMiddleware({
        keyGenerator: (req) => cacheKeys.school(req.params.id),
        ttl: 600, // 10 minutes
        condition: (req) => req.method === 'GET'
    }),

    // Cache dashboard stats
    dashboardStats: cacheMiddleware({
        keyGenerator: () => cacheKeys.dashboardStats(),
        ttl: 180, // 3 minutes
        condition: (req) => req.method === 'GET'
    }),

    // Cache team members
    teamMembers: cacheMiddleware({
        keyGenerator: () => cacheKeys.teamMembers(),
        ttl: 600, // 10 minutes
        condition: (req) => req.method === 'GET'
    }),

    // Cache subscriptions
    subscriptions: cacheMiddleware({
        keyGenerator: () => cacheKeys.subscriptions(),
        ttl: 300, // 5 minutes
        condition: (req) => req.method === 'GET'
    })
};

// Invalidation middleware for common routes
const invalidateMiddlewares = {
    // Invalidate schools cache
    schools: invalidateCache([
        cacheKeys.schools(),
        'school:*',
        cacheKeys.dashboardStats()
    ]),

    // Invalidate specific school cache
    school: invalidateCache([
        (req) => cacheKeys.school(req.params.id),
        (req) => cacheKeys.schoolStats(req.params.id),
        cacheKeys.schools(),
        cacheKeys.dashboardStats()
    ]),

    // Invalidate team cache
    team: invalidateCache([
        cacheKeys.teamMembers(),
        'user:*'
    ]),

    // Invalidate subscriptions cache
    subscriptions: invalidateCache([
        cacheKeys.subscriptions(),
        'subscription:*',
        'school:*',
        cacheKeys.dashboardStats()
    ])
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
    cacheMiddlewares,
    invalidateMiddlewares
};
