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
  User: { findOne: jest.fn(), findById: jest.fn(), create: jest.fn() },
  Store: { findById: jest.fn(), find: jest.fn() },
  Product: {}, Inventory: {}, StockRequest: {}, MatchResult: {},
  Transfer: {}, InventoryHistory: {},
}));

import bcrypt from 'bcryptjs';
import { app } from '../src/index';
import { User, Store } from '../src/models';

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

describe('POST /api/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    name: 'Yeni Kullanıcı', email: 'yeni@test.com',
    password: 'gizli123', store_id: 'store-1',
  };

  it('creates a store_manager and returns token', async () => {
    (Store.findById as jest.Mock).mockResolvedValue({ id: 'store-1', is_active: true });
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockImplementation(async (doc) => ({
      id: '99', ...doc,
    }));

    const res = await request(app).post('/api/auth/signup').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('store_manager');
  });

  it('forces store_manager role even if client sends admin', async () => {
    (Store.findById as jest.Mock).mockResolvedValue({ id: 'store-1', is_active: true });
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (User.create as jest.Mock).mockImplementation(async (doc) => ({ id: '99', ...doc }));

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validBody, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('store_manager');
    expect((User.create as jest.Mock).mock.calls[0][0].role).toBe('store_manager');
  });

  it('returns 400 when store is missing or inactive', async () => {
    (Store.findById as jest.Mock).mockResolvedValue(null);
    const res = await request(app).post('/api/auth/signup').send(validBody);
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    (Store.findById as jest.Mock).mockResolvedValue({ id: 'store-1', is_active: true });
    (User.findOne as jest.Mock).mockResolvedValue({ id: '1', email: 'yeni@test.com' });
    const res = await request(app).post('/api/auth/signup').send(validBody);
    expect(res.status).toBe(409);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validBody, password: '123' });
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
