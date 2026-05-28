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
jest.mock('../src/middleware/auth', () => ({
  __esModule: true,
  authenticate: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../src/models', () => ({
  __esModule: true,
  Product: {
    find:      jest.fn(),
    findById:  jest.fn(),
    create:    jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Store: {}, Inventory: {}, User: {}, StockRequest: {}, MatchResult: {},
  Transfer: {}, InventoryHistory: {},
}));

import { app } from '../src/index';
import { Product } from '../src/models';

const sample = { id: '1', name: 'Test Ürün', sku: 'SKU-001', category: 'Elektronik', price: 100 };

describe('GET /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns product list', async () => {
    (Product.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([sample]),
    });
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].sku).toBe('SKU-001');
  });
});

describe('POST /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a product', async () => {
    const newProduct = { name: 'Yeni', sku: 'SKU-999', category: 'Test', price: 50 };
    (Product.create as jest.Mock).mockResolvedValue({ id: '99', ...newProduct });
    const res = await request(app).post('/api/products').send(newProduct);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('99');
  });

  it('rejects invalid product', async () => {
    const res = await request(app).post('/api/products').send({ name: '' });
    expect(res.status).toBe(400);
  });
});
