import { Request, Response } from 'express';
import { z } from 'zod';
import { Store, Inventory, Transfer, StockRequest, User } from '../models';
import { cache } from '../config/redis';
import { parsePagination, parseSort, paginated } from '../utils/paginate';

const CACHE_KEY = 'stores:all';

const storeSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  is_active: z.boolean().optional(),
});

export async function getStores(req: Request, res: Response): Promise<void> {
  const p = parsePagination(req);
  const { sort_by, sort_dir } = parseSort(req, 'name', 'asc');
  const search    = (req.query.search as string)?.trim();
  const city      = (req.query.city   as string)?.trim();
  const isActive  = req.query.is_active === 'true' ? true
                  : req.query.is_active === 'false' ? false : undefined;

  const isLegacy = !p.isPaginated && !search && !city && isActive === undefined && !req.query.sort_by;
  if (isLegacy) {
    const cached = await cache.get(CACHE_KEY);
    if (cached) { res.json(cached); return; }
    const stores = await Store.find().sort({ name: 1 });
    await cache.set(CACHE_KEY, stores, 120);
    res.json(stores); return;
  }

  const filter: any = {};
  if (city) filter.city = city;
  if (isActive !== undefined) filter.is_active = isActive;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { city: rx }];
  }

  const [items, total] = await Promise.all([
    Store.find(filter).sort({ [sort_by]: sort_dir }).skip(p.skip).limit(p.limit),
    Store.countDocuments(filter),
  ]);
  res.json(paginated(items, total, p));
}

// GET /api/stores/cities – distinct cities
export async function getCities(_req: Request, res: Response): Promise<void> {
  const cached = await cache.get<string[]>('stores:cities');
  if (cached) { res.json(cached); return; }
  const cities = await Store.distinct('city');
  cities.sort();
  await cache.set('stores:cities', cities, 300);
  res.json(cities);
}

export async function getStore(req: Request, res: Response): Promise<void> {
  const store = await Store.findById(req.params.id);
  store ? res.json(store) : res.status(404).json({ error: 'Mağaza bulunamadı' });
}

export async function createStore(req: Request, res: Response): Promise<void> {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const store = await Store.create(parsed.data);
  await cache.del(CACHE_KEY);
  res.status(201).json(store);
}

export async function updateStore(req: Request, res: Response): Promise<void> {
  const parsed = storeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const store = await Store.findByIdAndUpdate(req.params.id, parsed.data, {
    new: true, runValidators: true,
  });
  if (!store) {
    res.status(404).json({ error: 'Mağaza bulunamadı' });
    return;
  }
  await cache.delPattern('inventory:*');
  await cache.del(CACHE_KEY);
  res.json(store);
}

export async function deleteStore(req: Request, res: Response): Promise<void> {
  const storeId = req.params.id;

  // Bagimli kayit kontrolu
  const [invCount, transferCount, requestCount, userCount] = await Promise.all([
    Inventory.countDocuments({ store_id: storeId }),
    Transfer.countDocuments({
      $or: [{ source_store_id: storeId }, { target_store_id: storeId }],
    }),
    StockRequest.countDocuments({ requesting_store_id: storeId }),
    User.countDocuments({ store_id: storeId }),
  ]);

  const force = req.query.force === 'true';

  if (!force && (invCount > 0 || transferCount > 0 || requestCount > 0 || userCount > 0)) {
    res.status(409).json({
      error: 'Mağazada bağlı kayıtlar var. Soft-delete (pasif yap) öneriliyor.',
      details: {
        inventory_rows: invCount,
        transfers: transferCount,
        requests: requestCount,
        users: userCount,
      },
      hint: 'Yine de silmek için ?force=true ekleyin (cascade delete yapılır)',
    });
    return;
  }

  if (force) {
    // Cascade delete
    await Promise.all([
      Inventory.deleteMany({ store_id: storeId }),
      Transfer.deleteMany({
        $or: [{ source_store_id: storeId }, { target_store_id: storeId }],
      }),
      StockRequest.deleteMany({ requesting_store_id: storeId }),
      User.updateMany({ store_id: storeId }, { $unset: { store_id: '' } }),
    ]);
  }

  const deleted = await Store.findByIdAndDelete(storeId);
  if (!deleted) {
    res.status(404).json({ error: 'Mağaza bulunamadı' });
    return;
  }

  await cache.delPattern('inventory:*');
  await cache.del(CACHE_KEY);
  await cache.del('dashboard:stats');
  res.status(204).send();
}
