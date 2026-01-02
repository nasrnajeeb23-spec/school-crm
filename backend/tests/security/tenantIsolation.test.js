process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

describe('Tenant isolation (schoolId param/query)', () => {
  it('denies school mismatch on requireSameSchoolQuery', async () => {
    const token = signToken({
      id: 100,
      email: 'admin1@test.local',
      role: 'SCHOOL_ADMIN',
      tokenVersion: 0,
      schoolId: 1,
      permissions: []
    });

    const res = await request(app)
      .get('/api/analytics/insights/at-risk-students?schoolId=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('denies teacher mismatch on requireSameSchoolQuery', async () => {
    const token = signToken({
      id: 101,
      email: 'teacher@test.local',
      role: 'TEACHER',
      tokenVersion: 0,
      schoolId: 1,
      permissions: []
    });

    const res = await request(app)
      .get('/api/analytics/insights/at-risk-students?schoolId=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('allows superadmin bypass on requireSameSchoolQuery', async () => {
    const token = signToken({
      id: 102,
      email: 'super@test.local',
      role: 'SUPER_ADMIN',
      tokenVersion: 0,
      schoolId: 999,
      permissions: []
    });

    const res = await request(app)
      .get('/api/analytics/insights/at-risk-students?schoolId=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).not.toBe(403);
  });
});
