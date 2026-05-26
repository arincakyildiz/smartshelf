import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { cache } from '../config/redis';

const CACHE_KEY = 'stores:all';

const storeSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  is_active: z.boolean().optional(),
});

export async function getStores(req: Request, res: Response): Promise<void> {
  const cached = await cache.get(CACHE_KEY);
  if (cached) {
    res.json(cached);
    return;
  }
  const result = await pool.query('SELECT * FROM stores ORDER BY name');
  await cache.set(CACHE_KEY, result.rows, 120);
  res.json(result.rows);
}

export async function getStore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM stores WHERE id = $1', [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Mağaza bulunamadı' });
    return;
  }
  res.json(result.rows[0]);
}

export async function createStore(req: Request, res: Response): Promise<void> {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { name, city, is_active = true } = parsed.data;
  const result = await pool.query(
    'INSERT INTO stores (name, city, is_active) VALUES ($1, $2, $3) RETURNING *',
    [name, city, is_active]
  );
  await cache.del(CACHE_KEY);
  res.status(201).json(result.rows[0]);
}

export async function updateStore(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = storeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const fields = parsed.data;
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) {
    res.status(400).json({ error: 'Güncellenecek alan yok' });
    return;
  }

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...keys.map((k) => fields[k]), id];

  const result = await pool.query(
    `UPDATE stores SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    values
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Mağaza bulunamadı' });
    return;
  }
  await cache.del(CACHE_KEY);
  res.json(result.rows[0]);
}
