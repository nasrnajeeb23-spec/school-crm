process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { sequelize, School: _School } = require('../../models');

let school1Id;
let school2Id;

function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

describe('Schools API', () => {
    beforeAll(async () => {
        await sequelize.query('PRAGMA foreign_keys = OFF;');
        await sequelize.sync({ force: true });
        await sequelize.query('PRAGMA foreign_keys = ON;');

        const s1 = await _School.create({ name: 'School 1', email: 's1@test.local', plan: 'PREMIUM' });
        const s2 = await _School.create({ name: 'School 2', email: 's2@test.local', plan: 'PREMIUM' });
        school1Id = s1.id;
        school2Id = s2.id;
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

            // Send 301 requests (exceeds limit of 300/minute for rateLimiters.api)
            for (let i = 0; i < 301; i++) {
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

    describe('RBAC and school isolation', () => {
        it('should deny access to school admin routes for teacher role', async () => {
            const token = signToken({
                id: 10,
                email: 'teacher@test.local',
                role: 'TEACHER',
                tokenVersion: 0,
                schoolId: school1Id,
                permissions: []
            });

            const response = await request(app)
                .get(`/api/school/${school1Id}/students`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });

        it('should deny access when schoolId param does not match user schoolId', async () => {
            const token = signToken({
                id: 11,
                email: 'admin@test.local',
                role: 'SCHOOL_ADMIN',
                tokenVersion: 0,
                schoolId: school2Id,
                permissions: []
            });

            const response = await request(app)
                .get(`/api/school/${school1Id}/students`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });

        it('should allow school admin to access own school data', async () => {
            const token = signToken({
                id: 12,
                email: 'admin2@test.local',
                role: 'SCHOOL_ADMIN',
                tokenVersion: 0,
                schoolId: school1Id,
                permissions: []
            });

            const response = await request(app)
                .get(`/api/school/${school1Id}/students`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('students');
        });
    });
});
