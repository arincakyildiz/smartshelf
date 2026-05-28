import { Request, Response } from 'express';
import { z } from 'zod';
import { Server as SocketServer } from 'socket.io';
import { Inventory, Product, Store, InventoryHistory } from '../models';
import { cache } from '../config/redis';
import { getStockLevel } from '../types';
import { logInventoryChange } from '../services/historyService';
import { parsePagination, paginated } from '../utils/paginate';

let io: SocketServer | null = null;
export function setSocketServer(socketIO: SocketServer): void {
  io = socketIO;
}

const patchSchema = z.object({
  quantity: z.number().int().min(0),
});

// GET /api/inventory  (optionally ?store_id=)
export async function getInventory(req: Request, res: Response): Promise<void> {
  const storeId = req.query.store_id as string | undefined;
  const cacheKey = storeId ? `inventory:store:${storeId}` : 'inventory:all';

  const cached = await cache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  const filter: any = {};
  if (storeId) filter.store_id = storeId;

  const rows = await Inventory.find(filter)
    .populate<{ store_id: any }>('store_id', 'name city')
    .populate<{ product_id: any }>('product_id', 'name sku category price')
    .lean();

  const mapped = rows.map((r: any) => ({
    id:           r._id.toString(),
    store_id:     r.store_id._id.toString(),
    product_id:   r.product_id._id.toString(),
    quantity:     r.quantity,
    updated_at:   r.updated_at,
    store_name:   r.store_id.name,
    store_city:   r.store_id.city,
    product_name: r.product_id.name,
    product_sku:  r.product_id.sku,
    category:     r.product_id.category,
    price:        r.product_id.price,
    stock_level:  getStockLevel(r.quantity),
  }));

  await cache.set(cacheKey, mapped, 30);
  res.json(mapped);
}

// GET /api/inventory/stats
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const cacheKey = 'dashboard:stats';
  const cached = await cache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  const [totalProducts, activeStores, quantities] = await Promise.all([
    Product.countDocuments(),
    Store.countDocuments({ is_active: true }),
    Inventory.find({}, 'quantity').lean(),
  ]);

  const qs = quantities.map((q) => q.quantity);
  const stats = {
    total_products: totalProducts,
    active_stores:  activeStores,
    critical_stock: qs.filter((q) => q < 10).length,
    low_stock:      qs.filter((q) => q >= 10 && q < 25).length,
    normal_stock:   qs.filter((q) => q >= 25).length,
    excess_stock:   qs.filter((q) => q >= 50).length,
  };

  await cache.set(cacheKey, stats, 30);
  res.json(stats);
}

// GET /api/inventory/excess-stores
export async function getExcessStores(req: Request, res: Response): Promise<void> {
  const cacheKey = 'inventory:excess-stores';
  const cached = await cache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  const rows = await Inventory.aggregate([
    {
      $group: {
        _id: '$store_id',
        total_quantity: { $sum: '$quantity' },
        excess_product_count: {
          $sum: { $cond: [{ $gte: ['$quantity', 50] }, 1, 0] },
        },
      },
    },
    {
      $lookup: { from: 'stores', localField: '_id', foreignField: '_id', as: 'store' },
    },
    { $unwind: '$store' },
    { $match: { 'store.is_active': true } },
    {
      $project: {
        _id: 0,
        store_id: { $toString: '$_id' },
        store_name: '$store.name',
        store_city: '$store.city',
        total_quantity: 1,
        excess_product_count: 1,
      },
    },
    { $sort: { total_quantity: -1 } },
  ]);

  await cache.set(cacheKey, rows, 30);
  res.json(rows);
}

// GET /api/inventory/products-with-stock
export async function getProductsWithStock(req: Request, res: Response): Promise<void> {
  const cacheKey = 'products:with-stock';
  const cached = await cache.get(cacheKey);
  if (cached) { res.json(cached); return; }

  const rows = await Product.aggregate([
    {
      $lookup: {
        from: 'inventory',
        localField: '_id',
        foreignField: 'product_id',
        as: 'inv',
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        sku: 1,
        category: 1,
        price: 1,
        created_at: 1,
        updated_at: 1,
        total_stock: { $sum: '$inv.quantity' },
        store_count: { $size: '$inv' },
      },
    },
    { $sort: { created_at: -1 } },
  ]);

  await cache.set(cacheKey, rows, 60);
  res.json(rows);
}

// GET /api/inventory/history?store_id=&product_id=&action_type=&page=&limit=
export async function getInventoryHistory(req: Request, res: Response): Promise<void> {
  const { store_id, product_id, action_type } = req.query as Record<string, string | undefined>;
  const p = parsePagination(req, 50);

  const filter: any = {};
  if (store_id)    filter.store_id    = store_id;
  if (product_id)  filter.product_id  = product_id;
  if (action_type) filter.action_type = action_type;

  const query = InventoryHistory.find(filter)
    .populate<{ store_id: any }>('store_id', 'name city')
    .populate<{ product_id: any }>('product_id', 'name sku')
    .populate<{ actor_id: any }>('actor_id', 'name email')
    .sort({ created_at: -1 });

  const total = p.isPaginated ? await InventoryHistory.countDocuments(filter) : 0;
  const rows = p.isPaginated
    ? await query.skip(p.skip).limit(p.limit).lean()
    : await query.limit(50).lean();

  const mapped = rows.map((r: any) => ({
    id:                  r._id.toString(),
    store_id:            r.store_id?._id?.toString(),
    store_name:          r.store_id?.name,
    product_id:          r.product_id?._id?.toString(),
    product_name:        r.product_id?.name,
    product_sku:         r.product_id?.sku,
    action_type:         r.action_type,
    quantity_changed:    r.quantity_changed,
    previous_quantity:   r.previous_quantity,
    new_quantity:        r.new_quantity,
    reason:              r.reason,
    actor_name:          r.actor_id?.name,
    created_at:          r.created_at,
  }));

  res.json(p.isPaginated ? paginated(mapped, total, p) : mapped);
}

// PATCH /api/inventory/:store_id/:product_id
export async function updateInventory(req: Request, res: Response): Promise<void> {
  const { store_id, product_id } = req.params;
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz miktar' });
    return;
  }
  const { quantity } = parsed.data;

  const existing = await Inventory.findOne({ store_id, product_id });
  const previousQuantity = existing?.quantity ?? 0;

  const row = await Inventory.findOneAndUpdate(
    { store_id, product_id },
    { quantity, updated_at: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Audit log
  if (previousQuantity !== quantity) {
    await logInventoryChange({
      store_id, product_id,
      action_type: 'MANUAL_UPDATE',
      previous_quantity: previousQuantity,
      new_quantity: quantity,
      reason: req.body.reason,
      actor_id: req.user?.id,
    });
  }

  await cache.delPattern('inventory:*');
  await cache.del('dashboard:stats');
  await cache.del('products:with-stock');

  if (io) {
    io.emit('inventory:update', {
      store_id,
      product_id,
      quantity,
      stock_level: getStockLevel(quantity),
    });
  }

  res.json({ ...row.toJSON(), stock_level: getStockLevel(quantity) });
}
