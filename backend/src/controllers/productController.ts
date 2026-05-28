import { Request, Response } from 'express';
import { z } from 'zod';
import { Product } from '../models';
import { cache } from '../config/redis';

const CACHE_KEY = 'products:all';

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
});

async function invalidateProductCache() {
  await cache.del(CACHE_KEY);
  await cache.del('products:with-stock');
  await cache.del('dashboard:stats');
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  const cached = await cache.get(CACHE_KEY);
  if (cached) { res.json(cached); return; }

  const products = await Product.find().sort({ created_at: -1 });
  await cache.set(CACHE_KEY, products, 120);
  res.json(products);
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const product = await Product.findById(req.params.id);
  product ? res.json(product) : res.status(404).json({ error: 'Ürün bulunamadı' });
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  try {
    const product = await Product.create(parsed.data);
    await invalidateProductCache();
    res.status(201).json(product);
  } catch (e: any) {
    if (e.code === 11000) {
      res.status(409).json({ error: 'Bu SKU zaten mevcut' });
      return;
    }
    throw e;
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { ...parsed.data, updated_at: new Date() },
    { new: true, runValidators: true }
  );
  if (!product) {
    res.status(404).json({ error: 'Ürün bulunamadı' });
    return;
  }
  await invalidateProductCache();
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Ürün bulunamadı' });
    return;
  }
  await invalidateProductCache();
  res.status(204).send();
}
