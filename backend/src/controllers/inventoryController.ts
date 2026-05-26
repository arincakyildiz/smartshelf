import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { cache } from '../config/redis';
import { getStockLevel } from '../types';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;
export function setSocketServer(socketIO: SocketServer): void {
  io = socketIO;
}

const patchSchema = z.object({
  quantity: z.number().int().min(0),
});

export async function getInventory(req: Request, res: Response): Promise<void> {
  const { store_id } = req.query;
  const cacheKey = store_id ? `inventory:store:${store_id}` : 'inventory:all';

  const cached = await cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  let query = `
    SELECT i.*, s.name AS store_name, s.city AS store_city,
           p.name AS product_name, p.sku AS product_sku, p.category, p.price
    FROM inventory i
    JOIN stores s ON s.id = i.store_id
    JOIN products p ON p.id = i.product_id
  `;
  const values: unknown[] = [];

  if (store_id) {
    query += ' WHERE i.store_id = $1';
    values.push(store_id);
  }
  query += ' ORDER BY s.name, p.name';

  const result = await pool.query(query, values);
  const rows = result.rows.map((r) => ({
    ...r,
    stock_level: getStockLevel(r.quantity),
  }));

  await cache.set(cacheKey, rows, 30);
  res.json(rows);
}

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const cacheKey = 'dashboard:stats';
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const [products, stores, inventory] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM products'),
    pool.query('SELECT COUNT(*) FROM stores WHERE is_active = true'),
    pool.query('SELECT quantity FROM inventory'),
  ]);

  const quantities = inventory.rows.map((r) => Number(r.quantity));
  const critical = quantities.filter((q) => q < 10).length;
  const low = quantities.filter((q) => q >= 10 && q < 25).length;
  const normal = quantities.filter((q) => q >= 25).length;

  const stats = {
    total_products: Number(products.rows[0].count),
    active_stores: Number(stores.rows[0].count),
    critical_stock: critical,
    low_stock: low,
    normal_stock: normal,
  };

  await cache.set(cacheKey, stats, 30);
  res.json(stats);
}

export async function updateInventory(req: Request, res: Response): Promise<void> {
  const { store_id, product_id } = req.params;
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz miktar' });
    return;
  }
  const { quantity } = parsed.data;

  const result = await pool.query(
    `INSERT INTO inventory (store_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (store_id, product_id)
     DO UPDATE SET quantity = $3, updated_at = NOW()
     RETURNING *`,
    [store_id, product_id, quantity]
  );

  await cache.delPattern('inventory:*');
  await cache.del('dashboard:stats');

  if (io) {
    io.emit('inventory:update', {
      store_id: Number(store_id),
      product_id: Number(product_id),
      quantity,
      stock_level: getStockLevel(quantity),
    });
  }

  res.json({ ...result.rows[0], stock_level: getStockLevel(quantity) });
}
