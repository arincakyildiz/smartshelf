import request from 'supertest';

jest.mock('../src/config/database', () => ({
  __esModule: true,
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  default: {},
}));
jest.mock('../src/config/redis', () => ({
  __esModule: true,
  cache: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn(), delPattern: jest.fn() },
  default: { on: jest.fn() },
}));
jest.mock('../src/models', () => ({
  __esModule: true,
  User: { findOne: jest.fn(), findById: jest.fn() },
  Product: {}, Store: {}, Inventory: {}, StockRequest: {}, MatchResult: {},
}));

import bcrypt from 'bcryptjs';
import { app } from '../src/index';
import { User } from '../src/models';

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 + token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('admin123', 4);
    (User.findOne as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'admin@test.com',
      password_hash: passwordHash,
      name: 'Admin',
      role: 'admin',
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
    (User.findOne as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'admin@test.com',
      password_hash: passwordHash,
      name: 'Admin',
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-pass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existing email', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
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

describe('Protected /api/products without token', () => {
  it('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/products').set('Authorization', 'Bearer fake.token');
    expect(res.status).toBe(401);
  });
});
