export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  created_at: Date;
  updated_at: Date;
}

export interface Store {
  id: number;
  name: string;
  city: string;
  is_active: boolean;
  created_at: Date;
}

export interface Inventory {
  id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  updated_at: Date;
  store_name?: string;
  store_city?: string;
  product_name?: string;
  product_sku?: string;
  stock_level?: 'critical' | 'low' | 'normal';
}

export interface StockRequest {
  id: number;
  requesting_store_id: number;
  product_id: number;
  quantity_needed: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: Date;
  store_name?: string;
  product_name?: string;
}

export interface MatchResult {
  source_store_id: number;
  source_store_name: string;
  source_store_city: string;
  available_quantity: number;
  score: number;
  reasons: string[];
}

export type StockLevel = 'critical' | 'low' | 'normal';

export function getStockLevel(quantity: number): StockLevel {
  if (quantity < 10) return 'critical';
  if (quantity < 25) return 'low';
  return 'normal';
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string; store_id?: string };
    }
  }
}
