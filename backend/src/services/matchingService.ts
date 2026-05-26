import pool from '../config/database';
import { MatchResult } from '../types';

/**
 * Match Scoring:
 * +40 - Fazla stok (istenenden 25+ fazla)
 * +25 - Yeterli stok (istenenden 10-24 fazla)
 * +30 - Aynı şehir
 * +10 - Aktif mağaza (base)
 */
export async function findMatches(
  requestingStoreId: number,
  productId: number,
  quantityNeeded: number
): Promise<MatchResult[]> {
  const result = await pool.query(
    `SELECT
       i.store_id,
       i.quantity,
       s.name AS store_name,
       s.city AS store_city,
       rs.city AS requesting_city
     FROM inventory i
     JOIN stores s ON s.id = i.store_id
     JOIN stores rs ON rs.id = $1
     WHERE i.product_id = $2
       AND i.store_id != $1
       AND i.quantity > 0
       AND s.is_active = true`,
    [requestingStoreId, productId]
  );

  const matches: MatchResult[] = result.rows
    .map((row) => {
      const available = Number(row.quantity);
      const excess = available - quantityNeeded;
      const reasons: string[] = [];
      let score = 10; // base

      if (excess >= 25) {
        score += 40;
        reasons.push('Fazla stok mevcut');
      } else if (excess >= 10) {
        score += 25;
        reasons.push('Yeterli stok mevcut');
      } else if (available >= quantityNeeded) {
        score += 10;
        reasons.push('Stok karşılanabilir');
      }

      if (row.store_city === row.requesting_city) {
        score += 30;
        reasons.push('Aynı şehir');
      }

      return {
        source_store_id: row.store_id,
        source_store_name: row.store_name,
        source_store_city: row.store_city,
        available_quantity: available,
        score,
        reasons,
      };
    })
    .filter((m) => m.available_quantity >= quantityNeeded || m.available_quantity > 0)
    .sort((a, b) => b.score - a.score);

  return matches;
}
