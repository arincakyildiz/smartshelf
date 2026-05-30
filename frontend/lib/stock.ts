export type StockLevel = 'critical' | 'low' | 'normal';

// Case dokümanındaki eşiklerle uyumlu: 10'dan az kritik, 10-24 düşük, 25+ normal
export function getStockLevel(quantity: number): StockLevel {
  if (quantity < 10) return 'critical';
  if (quantity < 25) return 'low';
  return 'normal';
}
