import { Request, Response } from 'express';
import { z } from 'zod';
import { Product } from '../models';
import { cache } from '../config/redis';
import { parsePagination, parseSort, paginated } from '../utils/paginate';

const CACHE_KEY = 'products:all';

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
});

async function invalidateProductCache() {
  await cache.delPattern('products:*');
  await cache.del('dashboard:stats');
}

// GET /api/products?page=&limit=&search=&category=&sort_by=&sort_dir=
export async function getProducts(req: Request, res: Response): Promise<void> {
  const p = parsePagination(req);
  const { sort_by, sort_dir } = parseSort(req, 'created_at', 'desc');
  const search   = (req.query.search   as string)?.trim();
  const category = (req.query.category as string)?.trim();

  // Legacy mode (no params at all) → cached array
  const isLegacyArray = !p.isPaginated && !search && !category && !req.query.sort_by;
  if (isLegacyArray) {
    const cached = await cache.get(CACHE_KEY);
    if (cached) { res.json(cached); return; }
    const all = await Product.find().sort({ created_at: -1 });
    await cache.set(CACHE_KEY, all, 120);
    res.json(all); return;
  }

  // Build filter
  const filter: any = {};
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sort_by]: sort_dir })
      .skip(p.skip)
      .limit(p.limit),
    Product.countDocuments(filter),
  ]);

  res.json(paginated(items, total, p));
}

// GET /api/products/categories – distinct list for filter dropdowns
export async function getCategories(_req: Request, res: Response): Promise<void> {
  const cached = await cache.get<string[]>('products:categories');
  if (cached) { res.json(cached); return; }
  const cats = await Product.distinct('category');
  cats.sort();
  await cache.set('products:categories', cats, 300);
  res.json(cats);
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
