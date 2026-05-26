-- SmartShelf Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, product_id)
);

CREATE TABLE IF NOT EXISTS stock_requests (
  id SERIAL PRIMARY KEY,
  requesting_store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_results (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES stock_requests(id) ON DELETE CASCADE,
  source_store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_requests_store ON stock_requests(requesting_store_id);
CREATE INDEX IF NOT EXISTS idx_requests_product ON stock_requests(product_id);

-- Seed data
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@smartshelf.com', '$2a$10$TdtPweROEtcqpB4uCmO7MuH9ntcK16V5LzAmu3VLowEFptpSAIHMm', 'Admin', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO stores (name, city) VALUES
  ('Mağaza A - Kadıköy', 'İstanbul'),
  ('Mağaza B - Beşiktaş', 'İstanbul'),
  ('Mağaza C - Ankara Merkez', 'Ankara'),
  ('Mağaza D - İzmir Alsancak', 'İzmir')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, sku, category, price) VALUES
  ('iPhone Şarj Kablosu', 'SKU-001', 'Elektronik', 299.90),
  ('Bluetooth Kulaklık', 'SKU-002', 'Elektronik', 899.00),
  ('Laptop Çantası', 'SKU-003', 'Aksesuar', 450.00),
  ('USB Hub 4 Port', 'SKU-004', 'Elektronik', 199.50),
  ('Kablosuz Mouse', 'SKU-005', 'Elektronik', 350.00)
ON CONFLICT DO NOTHING;

INSERT INTO inventory (store_id, product_id, quantity) VALUES
  (1, 1, 2),   -- Mağaza A: iPhone Şarj Kablosu - Kritik
  (1, 2, 15),  -- Mağaza A: Bluetooth Kulaklık - Düşük
  (1, 3, 30),  -- Mağaza A: Laptop Çantası - Normal
  (2, 1, 48),  -- Mağaza B: iPhone Şarj Kablosu - Fazla
  (2, 2, 5),   -- Mağaza B: Bluetooth Kulaklık - Kritik
  (2, 4, 60),  -- Mağaza B: USB Hub - Fazla
  (3, 1, 20),  -- Mağaza C: iPhone Şarj Kablosu - Düşük
  (3, 3, 8),   -- Mağaza C: Laptop Çantası - Kritik
  (3, 5, 35),  -- Mağaza C: Kablosuz Mouse - Normal
  (4, 2, 40),  -- Mağaza D: Bluetooth Kulaklık - Fazla
  (4, 4, 12),  -- Mağaza D: USB Hub - Düşük
  (4, 5, 3)    -- Mağaza D: Kablosuz Mouse - Kritik
ON CONFLICT DO NOTHING;
