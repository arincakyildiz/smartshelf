export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  store_id: string;
  product_id: string;
  quantity: number;
  store_name: string;
  store_city: string;
  product_name: string;
  product_sku: string;
  category: string;
  price: number;
  stock_level: 'critical' | 'low' | 'normal';
}

export interface DashboardStats {
  total_products: number;
  active_stores: number;
  critical_stock: number;
  low_stock: number;
  normal_stock: number;
  excess_stock: number;
}

export interface ExcessStore {
  store_id: string;
  store_name: string;
  store_city: string;
  total_quantity: number;
  excess_product_count: number;
}

export interface ProductWithStock extends Product {
  total_stock: number;
  store_count: number;
}

export interface StockRequest {
  id: string;
  requesting_store_id: string;
  product_id: string;
  quantity_needed: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: string;
  store_name?: string;
  product_name?: string;
  sku?: string;
}

export interface MatchResult {
  source_store_id: string;
  source_store_name?: string;
  store_name?: string;
  source_store_city?: string;
  store_city?: string;
  available_quantity: number;
  score: number;
  reasons: string[];
}
