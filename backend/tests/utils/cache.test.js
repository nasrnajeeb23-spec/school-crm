const { cache, cacheKeys } = require('../../utils/cache');

describe('Cache Utilities', () => {
    beforeEach(async () => {
        // Clear cache before each test
        await cache.delPattern('*');
    });

    describe('cache.set and cache.get', () => {
        it('should set and get value correctly', async () => {
            const key = 'test-key';
            const value = { name: 'Test', count: 42 };

            await cache.set(key, value, 60);
            const result = await cache.get(key);

            expect(result).toEqual(value);
        });

        it('should return null for non-existent key', async () => {
            const result = await cache.get('non-existent-key');
            expect(result).toBeNull();
        });

        it('should expire after TTL', async () => {
            const key = 'expire-test';
            const value = 'test-value';

            await cache.set(key, value, 1); // 1 second TTL

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            const result = await cache.get(key);
            expect(result).toBeNull();
        });
    });

    describe('cache.del', () => {
        it('should delete key', async () => {
            const key = 'delete-test';
            await cache.set(key, 'value', 60);

            await cache.del(key);
            const result = await cache.get(key);

            expect(result).toBeNull();
        });
    });

    describe('cache.delPattern', () => {
        it('should delete keys matching pattern', async () => {
            await cache.set('school:1', 'data1', 60);
            await cache.set('school:2', 'data2', 60);
            await cache.set('user:1', 'data3', 60);

            await cache.delPattern('school:*');

            const school1 = await cache.get('school:1');
            const school2 = await cache.get('school:2');
            const user1 = await cache.get('user:1');

            expect(school1).toBeNull();
            expect(school2).toBeNull();
            expect(user1).not.toBeNull();
        });
    });

    describe('cacheKeys', () => {
        it('should generate correct cache keys', () => {
            expect(cacheKeys.schools()).toBe('schools:all');
            expect(cacheKeys.school(123)).toBe('school:123');
            expect(cacheKeys.schoolStats(456)).toBe('school:456:stats');
            expect(cacheKeys.dashboardStats()).toBe('dashboard:stats');
        });
    });
});
