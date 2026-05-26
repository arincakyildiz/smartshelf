import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/database';
import { findMatches } from '../services/matchingService';

const requestSchema = z.object({
  requesting_store_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity_needed: z.number().int().positive(),
});

export async function createMatchRequest(req: Request, res: Response): Promise<void> {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { requesting_store_id, product_id, quantity_needed } = parsed.data;

  const stockRequest = await pool.query(
    `INSERT INTO stock_requests (requesting_store_id, product_id, quantity_needed)
     VALUES ($1, $2, $3) RETURNING *`,
    [requesting_store_id, product_id, quantity_needed]
  );

  const matches = await findMatches(requesting_store_id, product_id, quantity_needed);

  if (matches.length > 0) {
    const insertValues = matches
      .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
      .join(', ');
    const flatValues: unknown[] = [stockRequest.rows[0].id];
    matches.forEach((m) => {
      flatValues.push(m.source_store_id, m.score, m.available_quantity);
    });

    await pool.query(
      `INSERT INTO match_results (request_id, source_store_id, score, available_quantity)
       VALUES ${insertValues}`,
      flatValues
    );

    await pool.query(
      "UPDATE stock_requests SET status = 'fulfilled' WHERE id = $1",
      [stockRequest.rows[0].id]
    );
  }

  res.status(201).json({
    request: stockRequest.rows[0],
    matches,
  });
}

export async function getRequests(req: Request, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT sr.*, s.name AS store_name, p.name AS product_name, p.sku
     FROM stock_requests sr
     JOIN stores s ON s.id = sr.requesting_store_id
     JOIN products p ON p.id = sr.product_id
     ORDER BY sr.created_at DESC`
  );
  res.json(result.rows);
}

export async function getRequestMatches(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await pool.query(
    `SELECT mr.*, s.name AS store_name, s.city AS store_city
     FROM match_results mr
     JOIN stores s ON s.id = mr.source_store_id
     WHERE mr.request_id = $1
     ORDER BY mr.score DESC`,
    [id]
  );
  res.json(result.rows);
}
