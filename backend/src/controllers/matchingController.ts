import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { StockRequest, MatchResult, Store, Product } from '../models';
import { findMatches } from '../services/matchingService';

const requestSchema = z.object({
  requesting_store_id: z.string().min(1),
  product_id: z.string().min(1),
  quantity_needed: z.number().int().positive(),
});

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// POST /api/match-request
export async function createMatchRequest(req: Request, res: Response): Promise<void> {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { requesting_store_id, product_id, quantity_needed } = parsed.data;

  if (!isValidObjectId(requesting_store_id) || !isValidObjectId(product_id)) {
    res.status(400).json({ error: 'Geçersiz ID formatı' });
    return;
  }

  const stockRequest = await StockRequest.create({
    requesting_store_id,
    product_id,
    quantity_needed,
  });

  const matches = await findMatches(requesting_store_id, product_id, quantity_needed);

  if (matches.length > 0) {
    await MatchResult.insertMany(
      matches.map((m) => ({
        request_id:         stockRequest._id,
        source_store_id:    m.source_store_id,
        score:              m.score,
        available_quantity: m.available_quantity,
        reasons:            m.reasons,
      }))
    );
    stockRequest.status = 'fulfilled';
    await stockRequest.save();
  }

  const populated = await StockRequest.findById(stockRequest._id)
    .populate<{ requesting_store_id: any }>('requesting_store_id', 'name')
    .populate<{ product_id: any }>('product_id', 'name sku')
    .lean();

  res.status(201).json({
    request: {
      id:                  stockRequest.id,
      requesting_store_id: requesting_store_id,
      product_id:          product_id,
      quantity_needed,
      status:              stockRequest.status,
      created_at:          stockRequest.created_at,
      store_name:          (populated as any)?.requesting_store_id?.name,
      product_name:        (populated as any)?.product_id?.name,
      sku:                 (populated as any)?.product_id?.sku,
    },
    matches,
  });
}

// GET /api/requests
export async function getRequests(req: Request, res: Response): Promise<void> {
  const rows = await StockRequest.find()
    .populate<{ requesting_store_id: any }>('requesting_store_id', 'name')
    .populate<{ product_id: any }>('product_id', 'name sku')
    .sort({ created_at: -1 })
    .lean();

  const mapped = rows.map((r: any) => ({
    id:                  r._id.toString(),
    requesting_store_id: r.requesting_store_id?._id?.toString(),
    product_id:          r.product_id?._id?.toString(),
    quantity_needed:     r.quantity_needed,
    status:              r.status,
    created_at:          r.created_at,
    store_name:          r.requesting_store_id?.name,
    product_name:        r.product_id?.name,
    sku:                 r.product_id?.sku,
  }));

  res.json(mapped);
}

// GET /api/requests/:id/matches
export async function getRequestMatches(req: Request, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'Geçersiz ID' });
    return;
  }
  const rows = await MatchResult.find({ request_id: req.params.id })
    .populate<{ source_store_id: any }>('source_store_id', 'name city')
    .sort({ score: -1 })
    .lean();

  const mapped = rows.map((r: any) => ({
    score:              r.score,
    available_quantity: r.available_quantity,
    reasons:            r.reasons,
    source_store_id:    r.source_store_id?._id?.toString(),
    store_name:         r.source_store_id?.name,
    store_city:         r.source_store_id?.city,
  }));

  res.json(mapped);
}
