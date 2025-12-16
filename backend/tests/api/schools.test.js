const request = require('supertest');
const app = require('../../app');
const { sequelize, School: _School } = require('../../models');

describe('Schools API', () => {
    beforeAll(async () => {
        await sequelize.query('PRAGMA foreign_keys = OFF;');
        await sequelize.sync({ force: true });
        await sequelize.query('PRAGMA foreign_keys = ON;');
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('GET /api/schools', () => {
        it('should return paginated schools', async () => {
            const response = await request(app)
                .get('/api/schools?page=1&limit=10')
                .set('Authorization', 'Bearer valid_token');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(response.body.pagination).toHaveProperty('currentPage', 1);
            expect(response.body.pagination).toHaveProperty('itemsPerPage', 10);
        });

        it('should validate pagination parameters', async () => {
            const response = await request(app)
                .get('/api/schools?page=-1&limit=200')
                .set('Authorization', 'Bearer valid_token');

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should return cached data on second request', async () => {
            // First request
            const response1 = await request(app)
                .get('/api/schools')
                .set('Authorization', 'Bearer valid_token');

            // Second request (should be cached)
            const response2 = await request(app)
                .get('/api/schools')
                .set('Authorization', 'Bearer valid_token');

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body).toEqual(response2.body);
        });
    });

    describe('POST /api/schools', () => {
        it('should create a new school with valid data', async () => {
            const newSchool = {
                name: 'مدرسة الاختبار',
                email: 'test@school.com',
                phone: '0501234567',
                plan: 'PREMIUM'
            };

            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', 'Bearer valid_token')
                .send(newSchool);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe(newSchool.name);
        });

        it('should reject invalid school data', async () => {
            const invalidSchool = {
                name: '',
                email: 'invalid-email',
                phone: '123'
            };

            const response = await request(app)
                .post('/api/schools')
                .set('Authorization', 'Bearer valid_token')
                .send(invalidSchool);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.type).toBe('ValidationError');
        });

        it('should enforce rate limiting', async () => {
            const requests = [];

            // Send 101 requests (exceeds limit of 100)
            for (let i = 0; i < 101; i++) {
                requests.push(
                    request(app)
                        .post('/api/schools')
                        .set('Authorization', 'Bearer valid_token')
                        .send({ name: `School ${i}` })
                );
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.filter(r => r.status === 429);

            expect(rateLimited.length).toBeGreaterThan(0);
        });
    });
});
