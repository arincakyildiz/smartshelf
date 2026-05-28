import { Request, Response } from 'express';
import { z } from 'zod';
import { Store } from '../models';
import { cache } from '../config/redis';

const CACHE_KEY = 'stores:all';

const storeSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  is_active: z.boolean().optional(),
});

export async function getStores(req: Request, res: Response): Promise<void> {
  const cached = await cache.get(CACHE_KEY);
  if (cached) { res.json(cached); return; }

  const stores = await Store.find().sort({ name: 1 });
  await cache.set(CACHE_KEY, stores, 120);
  res.json(stores);
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
  await cache.del(CACHE_KEY);
  res.json(store);
}
