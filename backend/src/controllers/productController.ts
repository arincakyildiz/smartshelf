import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { cache } from '../config/redis';

const CACHE_KEY = 'products:all';

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
});

export async function getProducts(req: Request, res: Response): Promise<void> {
  const cached = await cache.get(CACHE_KEY);
  if (cached) {
    res.json(cached);
    return;
  }

  const result = await pool.query(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  await cache.set(CACHE_KEY, result.rows, 120);
  res.json(result.rows);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Ürün bulunamadı' });
    return;
  }
  res.json(result.rows[0]);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { name, sku, category, price } = parsed.data;

  const result = await pool.query(
    'INSERT INTO products (name, sku, category, price) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, sku, category, price]
  );
  await cache.del(CACHE_KEY);
  res.status(201).json(result.rows[0]);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = productSchema.partial().safeParse(req.body);
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
  const values = keys.map((k) => fields[k]);
  values.push(id as unknown as number);

  const result = await pool.query(
    `UPDATE products SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    values
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Ürün bulunamadı' });
    return;
  }
  await cache.del(CACHE_KEY);
  res.json(result.rows[0]);
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) {
    res.status(404).json({ error: 'Ürün bulunamadı' });
    return;
  }
  await cache.del(CACHE_KEY);
  res.status(204).send();
}
