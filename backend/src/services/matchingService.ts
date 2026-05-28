import { Inventory, Store } from '../models';
import { MatchResult } from '../types';

/**
 * Match Scoring:
 * +40 - Fazla stok (istenenden 25+ fazla)
 * +25 - Yeterli stok (istenenden 10-24 fazla)
 * +10 - Stok karşılanabilir
 * +30 - Aynı şehir
 * +10 - base
 */
export async function findMatches(
  requestingStoreId: string,
  productId: string,
  quantityNeeded: number
): Promise<MatchResult[]> {
  const reqStore = await Store.findById(requestingStoreId).lean();
  if (!reqStore) return [];

  const candidates = await Inventory.find({
    product_id: productId,
    store_id: { $ne: requestingStoreId },
    quantity: { $gt: 0 },
  })
    .populate<{ store_id: any }>('store_id', 'name city is_active')
    .lean();

  const matches: MatchResult[] = candidates
    .filter((c: any) => c.store_id?.is_active)
    .map((c: any) => {
      const available = c.quantity;
      const excess = available - quantityNeeded;
      const reasons: string[] = [];
      let score = 10;

      if (excess >= 25)        { score += 40; reasons.push('Fazla stok mevcut'); }
      else if (excess >= 10)   { score += 25; reasons.push('Yeterli stok mevcut'); }
      else if (available >= quantityNeeded) { score += 10; reasons.push('Stok karşılanabilir'); }

      if (c.store_id.city === reqStore.city) {
        score += 30;
        reasons.push('Aynı şehir');
      }

      return {
        source_store_id:    c.store_id._id.toString(),
        source_store_name:  c.store_id.name,
        source_store_city:  c.store_id.city,
        available_quantity: available,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);

  return matches;
}
