import { Request, Response, NextFunction } from 'express';

/**
 * Role-based authorization middleware.
 * Use AFTER `authenticate`.
 * Example: router.post('/admin-only', authenticate, requireRole('admin'), handler)
 */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Yetkilendirme gerekli' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }
    next();
  };
}

/**
 * Store manager can only access their own store.
 * Reads `:store_id` param, query.store_id, or body.store_id.
 */
export function enforceStoreScope(getStoreId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') { next(); return; }
    const storeId = getStoreId(req);
    if (!storeId || storeId !== (req.user as any)?.store_id?.toString()) {
      res.status(403).json({ error: 'Sadece kendi mağazanız için erişim' });
      return;
    }
    next();
  };
}
