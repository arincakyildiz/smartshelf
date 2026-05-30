import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Merkezi hata yakalayıcı. Mongoose'a özgü hataları anlamlı HTTP
 * kodlarına çevirir; beklenmeyen hatalarda production'da iç mesajı sızdırmaz.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Geçersiz ObjectId vb.
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: 'Geçersiz değer formatı', code: 'VALIDATION', field: err.path });
    return;
  }

  // Şema doğrulama hatası
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: 'Doğrulama hatası',
      code: 'VALIDATION',
      details: Object.values(err.errors).map((e) => e.message),
    });
    return;
  }

  // Benzersizlik ihlali (ör. aynı SKU / e-posta)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'kayıt';
    res.status(409).json({ error: `Bu ${field} zaten kullanımda`, code: 'DUPLICATE_FIELD', field });
    return;
  }

  console.error(err?.stack ?? err);

  const status = typeof err?.status === 'number' ? err.status : 500;
  const body: Record<string, unknown> = { error: 'Sunucu hatası', code: 'SERVER' };
  if (process.env.NODE_ENV !== 'production') {
    body.message = err?.message;
  }
  res.status(status).json(body);
}
