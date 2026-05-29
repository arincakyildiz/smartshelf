import mongoose from 'mongoose';
import { asyncHandler } from '../src/utils/asyncHandler';
import { errorHandler } from '../src/middleware/errorHandler';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  } as any;
}

describe('asyncHandler()', () => {
  it('reddedilen promise hatasını next()e iletir', async () => {
    const boom = new Error('patladı');
    const handler = asyncHandler(async () => { throw boom; });
    const next = jest.fn();

    await handler({} as any, mockRes(), next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('başarılı handlerda next() çağrılmaz', async () => {
    const res = mockRes();
    const handler = asyncHandler(async (_req, r: any) => { r.json({ ok: true }); });
    const next = jest.fn();

    await handler({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

describe('errorHandler()', () => {
  const realEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = realEnv; });

  it('CastError -> 400', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'abc', 'id');
    const res = mockRes();
    errorHandler(err as any, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('duplicate key (11000) -> 409', () => {
    const err: any = { code: 11000, keyValue: { sku: 'SKU-001' } };
    const res = mockRes();
    errorHandler(err, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Bu sku zaten kullanımda' });
  });

  it('beklenmeyen hata -> 500 ve productionda message sızdırmaz', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    errorHandler(new Error('iç detay') as any, {} as any, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sunucu hatası' });
  });

  it('production dışında message döner', () => {
    process.env.NODE_ENV = 'test';
    const res = mockRes();
    errorHandler(new Error('iç detay') as any, {} as any, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ error: 'Sunucu hatası', message: 'iç detay' });
  });
});
