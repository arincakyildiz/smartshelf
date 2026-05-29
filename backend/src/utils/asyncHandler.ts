import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Express 4, async handler içinde reddedilen promise'leri kendiliğinden
 * yakalamaz; bu sarmalayıcı hatayı next()'e iletir, böylece errorHandler
 * devreye girer ve istek asılı kalmaz.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
