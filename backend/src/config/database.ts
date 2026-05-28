import { Pool, PoolConfig } from 'pg';

let pool: Pool;

if (process.env.USE_INMEMORY_DB === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require('pg-mem');
  const db = newDb({ autoCreateForeignKeyIndices: true });

  // Schema – pg-mem compatible (no DECIMAL precision, no ON CONFLICT, no CHECK)
  db.public.none(`
    CREATE TABLE users (
      id            serial PRIMARY KEY,
      email         varchar(255) UNIQUE NOT NULL,
      password_hash varchar(255) NOT NULL,
      name          varchar(255) NOT NULL,
      role          varchar(50) DEFAULT 'admin',
      created_at    timestamp DEFAULT now()
    );

    CREATE TABLE products (
      id         serial PRIMARY KEY,
      name       varchar(255) NOT NULL,
      sku        varchar(100) UNIQUE NOT NULL,
      category   varchar(100) NOT NULL,
      price      numeric NOT NULL,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );

    CREATE TABLE stores (
      id         serial PRIMARY KEY,
      name       varchar(255) NOT NULL,
      city       varchar(100) NOT NULL,
      is_active  boolean DEFAULT true,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE inventory (
      id         serial PRIMARY KEY,
      store_id   integer REFERENCES stores(id) ON DELETE CASCADE,
      product_id integer REFERENCES products(id) ON DELETE CASCADE,
      quantity   integer DEFAULT 0,
      updated_at timestamp DEFAULT now(),
      UNIQUE (store_id, product_id)
    );

    CREATE TABLE stock_requests (
      id                  serial PRIMARY KEY,
      requesting_store_id integer REFERENCES stores(id) ON DELETE CASCADE,
      product_id          integer REFERENCES products(id) ON DELETE CASCADE,
      quantity_needed     integer NOT NULL,
      status              varchar(50) DEFAULT 'pending',
      created_at          timestamp DEFAULT now()
    );

    CREATE TABLE match_results (
      id                 serial PRIMARY KEY,
      request_id         integer REFERENCES stock_requests(id) ON DELETE CASCADE,
      source_store_id    integer REFERENCES stores(id) ON DELETE CASCADE,
      score              integer NOT NULL,
      available_quantity integer NOT NULL,
      created_at         timestamp DEFAULT now()
    );
  `);

  // Seed data – bcrypt hash of "admin123" pre-computed
  db.public.none(`
    INSERT INTO users (email, password_hash, name, role) VALUES
      ('admin@smartshelf.com', '$2a$10$TdtPweROEtcqpB4uCmO7MuH9ntcK16V5LzAmu3VLowEFptpSAIHMm', 'Admin', 'admin');

    INSERT INTO stores (name, city) VALUES
      ('Mağaza A - Kadıköy',       'İstanbul'),
      ('Mağaza B - Beşiktaş',      'İstanbul'),
      ('Mağaza C - Ankara Merkez', 'Ankara'),
      ('Mağaza D - İzmir Alsancak','İzmir');

    INSERT INTO products (name, sku, category, price) VALUES
      ('iPhone Şarj Kablosu', 'SKU-001', 'Elektronik', 299.90),
      ('Bluetooth Kulaklık',  'SKU-002', 'Elektronik', 899.00),
      ('Laptop Çantası',      'SKU-003', 'Aksesuar',   450.00),
      ('USB Hub 4 Port',      'SKU-004', 'Elektronik', 199.50),
      ('Kablosuz Mouse',      'SKU-005', 'Elektronik', 350.00);

    INSERT INTO inventory (store_id, product_id, quantity) VALUES
      (1, 1, 2),  (1, 2, 15), (1, 3, 30),
      (2, 1, 48), (2, 2, 5),  (2, 4, 60),
      (3, 1, 20), (3, 3, 8),  (3, 5, 35),
      (4, 2, 40), (4, 4, 12), (4, 5, 3);
  `);

  const { Pool: PgMemPool } = db.adapters.createPg();
  pool = new PgMemPool() as unknown as Pool;
  console.log('[DB] Using in-memory PostgreSQL (pg-mem) – seeded');
} else {
  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  pool = new Pool(config);
  pool.on('error', (err) => console.error('Unexpected database error:', err));
  console.log('[DB] Using PostgreSQL via', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
}

export default pool;
