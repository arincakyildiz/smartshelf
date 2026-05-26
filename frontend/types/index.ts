export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  created_at: string;
}

export interface Store {
  id: number;
  name: string;
  city: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: number;
  store_id: number;
  product_id: number;
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
}

export interface StockRequest {
  id: number;
  requesting_store_id: number;
  product_id: number;
  quantity_needed: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: string;
  store_name: string;
  product_name: string;
  sku: string;
}

export interface MatchResult {
  source_store_id: number;
  source_store_name: string;
  source_store_city: string;
  available_quantity: number;
  score: number;
  reasons: string[];
}
