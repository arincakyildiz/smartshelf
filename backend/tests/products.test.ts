import request from 'supertest';
import { app } from '../src/index';

jest.mock('../src/config/database', () => ({
  default: { query: jest.fn() },
}));
jest.mock('../src/config/redis', () => ({
  cache: { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() },
  default: { on: jest.fn() },
}));
jest.mock('../src/middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

import pool from '../src/config/database';
const mockQuery = pool.query as jest.Mock;

describe('GET /api/products', () => {
  it('returns product list', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, name: 'Test Ürün', sku: 'SKU-001', category: 'Elektronik', price: 100 }],
    });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe('SKU-001');
  });
});

describe('POST /api/products', () => {
  it('creates a product', async () => {
    const product = { name: 'Yeni Ürün', sku: 'SKU-999', category: 'Test', price: 50 };
    mockQuery.mockResolvedValue({ rows: [{ id: 99, ...product }] });

    const res = await request(app).post('/api/products').send(product);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(99);
  });

  it('rejects invalid product', async () => {
    const res = await request(app).post('/api/products').send({ name: '' });
    expect(res.status).toBe(400);
  });
});
