import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

jest.mock('../src/config/database', () => ({ default: { query: jest.fn() } }));
jest.mock('../src/config/redis', () => ({
  cache: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn(), delPattern: jest.fn() },
  default: { on: jest.fn() },
}));

import bcrypt from 'bcryptjs';
import pool from '../src/config/database';
import { app } from '../src/index';

const mockQuery = pool.query as jest.Mock;

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 + token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('admin123', 4);
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, email: 'admin@test.com', password_hash: passwordHash, name: 'Admin', role: 'admin' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@test.com');
  });

  it('returns 401 for wrong password', async () => {
    const passwordHash = await bcrypt.hash('admin123', 4);
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, email: 'admin@test.com', password_hash: passwordHash, name: 'Admin', role: 'admin' }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-pass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existing email', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid payload (bad email)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'admin123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Protected route /api/products without token', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header has invalid token', async () => {
    const res = await request(app).get('/api/products').set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});
