import mongoose from 'mongoose';
import { User, Product, Store, Inventory, Transfer, StockRequest } from '../models';

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

  // bcrypt hashes (cost 10) – plaintext: admin123 / manager123
  const ADMIN_HASH   = '$2a$10$TdtPweROEtcqpB4uCmO7MuH9ntcK16V5LzAmu3VLowEFptpSAIHMm';
  const MANAGER_HASH = '$2a$10$qBnW3rXuOAjL.r9p3.qfJOG3UqKjzqcOZpdNNF7QO1lOpKb7ToVte'; // manager123

  const stores = await Store.insertMany([
    { name: 'Mağaza A - Kadıköy',        city: 'İstanbul' },
    { name: 'Mağaza B - Beşiktaş',       city: 'İstanbul' },
    { name: 'Mağaza C - Ankara Merkez',  city: 'Ankara'   },
    { name: 'Mağaza D - İzmir Alsancak', city: 'İzmir'    },
    { name: 'Mağaza E - Bursa Nilüfer',  city: 'Bursa'    },
    { name: 'Depo - İstanbul',           city: 'İstanbul' },
  ]);

  await User.insertMany([
    { email: 'admin@smartshelf.com',     password_hash: ADMIN_HASH,   name: 'Admin',          role: 'admin' },
    { email: 'manager.a@smartshelf.com', password_hash: MANAGER_HASH, name: 'Mağaza A Yöneticisi', role: 'store_manager', store_id: stores[0]._id },
    { email: 'manager.b@smartshelf.com', password_hash: MANAGER_HASH, name: 'Mağaza B Yöneticisi', role: 'store_manager', store_id: stores[1]._id },
  ]);

  const products = await Product.insertMany([
    { name: 'iPhone Şarj Kablosu',     sku: 'SKU-001', category: 'Elektronik', price: 299.90 },
    { name: 'Bluetooth Kulaklık',      sku: 'SKU-002', category: 'Elektronik', price: 899.00 },
    { name: 'Laptop Çantası',          sku: 'SKU-003', category: 'Aksesuar',   price: 450.00 },
    { name: 'USB Hub 4 Port',          sku: 'SKU-004', category: 'Elektronik', price: 199.50 },
    { name: 'Kablosuz Mouse',          sku: 'SKU-005', category: 'Elektronik', price: 350.00 },
    { name: 'Mekanik Klavye',          sku: 'SKU-006', category: 'Elektronik', price: 1450.00 },
    { name: 'Webcam HD 1080p',         sku: 'SKU-007', category: 'Elektronik', price: 580.00 },
    { name: 'Powerbank 20000mAh',      sku: 'SKU-008', category: 'Elektronik', price: 750.00 },
    { name: 'HDMI Kablo 2m',           sku: 'SKU-009', category: 'Elektronik', price: 85.00 },
    { name: 'Telefon Kılıfı',          sku: 'SKU-010', category: 'Aksesuar',   price: 120.00 },
    { name: 'Ekran Koruyucu Cam',      sku: 'SKU-011', category: 'Aksesuar',   price: 65.00 },
    { name: 'Araç Telefon Tutucu',     sku: 'SKU-012', category: 'Aksesuar',   price: 180.00 },
    { name: 'Bluetooth Hoparlör',      sku: 'SKU-013', category: 'Elektronik', price: 1250.00 },
    { name: 'Kablosuz Şarj Pedi',      sku: 'SKU-014', category: 'Elektronik', price: 320.00 },
    { name: 'Tablet Standı',           sku: 'SKU-015', category: 'Aksesuar',   price: 240.00 },
    { name: 'USB-C Adaptör',           sku: 'SKU-016', category: 'Elektronik', price: 95.00 },
    { name: 'Notebook Soğutucu',       sku: 'SKU-017', category: 'Aksesuar',   price: 380.00 },
    { name: 'Akıllı Saat Kayışı',      sku: 'SKU-018', category: 'Aksesuar',   price: 150.00 },
    { name: 'AirPods Pro Kılıfı',      sku: 'SKU-019', category: 'Aksesuar',   price: 89.00 },
    { name: 'Gaming Mousepad XL',      sku: 'SKU-020', category: 'Aksesuar',   price: 220.00 },
    { name: 'RGB LED Şerit',           sku: 'SKU-021', category: 'Aydınlatma', price: 175.00 },
    { name: 'Mini Vantilatör',         sku: 'SKU-022', category: 'Aksesuar',   price: 145.00 },
  ]);

  // Generate inventory rows (~5-8 products per store, varied stock levels)
  type Row = { s: number; p: number; q: number };
  const rows: Row[] = [
    // Mağaza A - Kadıköy (İstanbul)
    { s:0, p:0, q:2  }, { s:0, p:1, q:15 }, { s:0, p:2, q:30 }, { s:0, p:5, q:6  }, { s:0, p:7, q:20 }, { s:0, p:11, q:42 }, { s:0, p:15, q:9 },
    // Mağaza B - Beşiktaş (İstanbul)
    { s:1, p:0, q:48 }, { s:1, p:1, q:5  }, { s:1, p:3, q:60 }, { s:1, p:6, q:18 }, { s:1, p:12, q:55 }, { s:1, p:14, q:7 }, { s:1, p:18, q:33 },
    // Mağaza C - Ankara
    { s:2, p:0, q:20 }, { s:2, p:2, q:8  }, { s:2, p:4, q:35 }, { s:2, p:8, q:90 }, { s:2, p:10, q:14 }, { s:2, p:16, q:3 }, { s:2, p:19, q:65 },
    // Mağaza D - İzmir
    { s:3, p:1, q:40 }, { s:3, p:3, q:12 }, { s:3, p:4, q:3  }, { s:3, p:9, q:25 }, { s:3, p:13, q:50 }, { s:3, p:17, q:22 }, { s:3, p:20, q:11 },
    // Mağaza E - Bursa
    { s:4, p:2, q:7  }, { s:4, p:5, q:28 }, { s:4, p:7, q:80 }, { s:4, p:11, q:4 }, { s:4, p:13, q:16 }, { s:4, p:18, q:60 }, { s:4, p:21, q:38 },
    // Depo - İstanbul
    { s:5, p:0, q:120}, { s:5, p:6, q:75 }, { s:5, p:9, q:200}, { s:5, p:14, q:80 }, { s:5, p:16, q:150}, { s:5, p:20, q:90 }, { s:5, p:21, q:130},
  ];

  await Inventory.insertMany(
    rows.map((r) => ({
      store_id:   stores[r.s]._id,
      product_id: products[r.p]._id,
      quantity:   r.q,
    }))
  );

  // Sample stock requests
  const sampleRequests = await StockRequest.insertMany([
    {
      requesting_store_id: stores[0]._id, product_id: products[0]._id, quantity_needed: 10,
      status: 'fulfilled',
    },
    {
      requesting_store_id: stores[2]._id, product_id: products[2]._id, quantity_needed: 8,
      status: 'pending',
    },
  ]);

  // Sample transfers
  await Transfer.insertMany([
    {
      source_store_id: stores[1]._id, target_store_id: stores[0]._id,
      product_id: products[0]._id, quantity: 10,
      status: 'COMPLETED',
      approved_at: new Date(Date.now() - 86400e3),
      completed_at: new Date(Date.now() - 3600e3),
      notes: 'Mağaza A kritik stok için B mağazasından transfer',
    },
    {
      source_store_id: stores[5]._id, target_store_id: stores[2]._id,
      product_id: products[2]._id, quantity: 15,
      status: 'PENDING',
      notes: 'Ankara için depodan stok talebi',
    },
    {
      source_store_id: stores[2]._id, target_store_id: stores[4]._id,
      product_id: products[4]._id, quantity: 5,
      status: 'APPROVED',
      approved_at: new Date(Date.now() - 1800e3),
      notes: 'Bursa eksikliği için Ankara onaylı',
    },
  ]);

  console.log(`[DB] Seeded: ${stores.length} stores, ${products.length} products, ${rows.length} inventory, ${sampleRequests.length} requests, 3 transfers`);
}

export default mongoose;
