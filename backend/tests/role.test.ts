import { requireRole, enforceStoreScope } from '../src/middleware/role';

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  } as any;
}

describe('requireRole()', () => {
  it('returns 401 if user not authenticated', () => {
    const req: any = {};
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if role not in allowed list', () => {
    const req: any = { user: { role: 'store_manager' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() if role is allowed', () => {
    const req: any = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts multiple roles', () => {
    const req: any = { user: { role: 'store_manager' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin', 'store_manager')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('enforceStoreScope()', () => {
  it('admin can access any store', () => {
    const req: any = { user: { role: 'admin' }, params: { store_id: 'other-store' } };
    const res = mockRes();
    const next = jest.fn();
    enforceStoreScope((r) => r.params.store_id)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('store_manager can access own store', () => {
    const req: any = {
      user: { role: 'store_manager', store_id: 'my-store' },
      params: { store_id: 'my-store' },
    };
    const res = mockRes();
    const next = jest.fn();
    enforceStoreScope((r) => r.params.store_id)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('store_manager cannot access other stores', () => {
    const req: any = {
      user: { role: 'store_manager', store_id: 'my-store' },
      params: { store_id: 'other-store' },
    };
    const res = mockRes();
    const next = jest.fn();
    enforceStoreScope((r) => r.params.store_id)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
