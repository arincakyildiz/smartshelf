import mongoose from 'mongoose';
import { User, Product, Store, Inventory } from '../models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartshelf';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected to MongoDB:', MONGODB_URI.replace(/:[^@/]*@/, ':***@'));
  await seedIfEmpty();
}

async function seedIfEmpty(): Promise<void> {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[DB] Skipping seed – database already has data');
    return;
  }

  console.log('[DB] Seeding initial data...');

  // bcrypt hash of "admin123" (cost 10)
  await User.create({
    email: 'admin@smartshelf.com',
    password_hash: '$2a$10$TdtPweROEtcqpB4uCmO7MuH9ntcK16V5LzAmu3VLowEFptpSAIHMm',
    name: 'Admin',
    role: 'admin',
  });

  const stores = await Store.insertMany([
    { name: 'Mağaza A - Kadıköy',        city: 'İstanbul' },
    { name: 'Mağaza B - Beşiktaş',       city: 'İstanbul' },
    { name: 'Mağaza C - Ankara Merkez',  city: 'Ankara'   },
    { name: 'Mağaza D - İzmir Alsancak', city: 'İzmir'    },
  ]);

  const products = await Product.insertMany([
    { name: 'iPhone Şarj Kablosu', sku: 'SKU-001', category: 'Elektronik', price: 299.90 },
    { name: 'Bluetooth Kulaklık',  sku: 'SKU-002', category: 'Elektronik', price: 899.00 },
    { name: 'Laptop Çantası',      sku: 'SKU-003', category: 'Aksesuar',   price: 450.00 },
    { name: 'USB Hub 4 Port',      sku: 'SKU-004', category: 'Elektronik', price: 199.50 },
    { name: 'Kablosuz Mouse',      sku: 'SKU-005', category: 'Elektronik', price: 350.00 },
  ]);

  const inv = [
    [0, 0, 2],  [0, 1, 15], [0, 2, 30],
    [1, 0, 48], [1, 1, 5],  [1, 3, 60],
    [2, 0, 20], [2, 2, 8],  [2, 4, 35],
    [3, 1, 40], [3, 3, 12], [3, 4, 3],
  ];

  await Inventory.insertMany(
    inv.map(([s, p, q]) => ({
      store_id:   stores[s]._id,
      product_id: products[p]._id,
      quantity:   q,
    }))
  );

  console.log(`[DB] Seeded: ${stores.length} stores, ${products.length} products, ${inv.length} inventory rows`);
}

export default mongoose;
