/**
 * SmartShelf – Zero-dependency Demo Server
 * Sadece Node.js built-in modülleri kullanır. npm install gerekmez.
 * Çalıştır: node demo-server.js
 */
const http = require('http');
const url  = require('url');

const PORT = 4000;

// ─── In-memory DB ─────────────────────────────────────────────────────────────
let seq = { products: 6, stores: 5, inventory: 13, requests: 1 };
const nextId = k => seq[k]++;

const db = {
  users: [
    { id: 1, email: 'admin@smartshelf.com', password: 'admin123', name: 'Admin', role: 'admin' },
  ],
  products: [
    { id: 1, name: 'iPhone Şarj Kablosu', sku: 'SKU-001', category: 'Elektronik', price: 299.90 },
    { id: 2, name: 'Bluetooth Kulaklık',  sku: 'SKU-002', category: 'Elektronik', price: 899.00 },
    { id: 3, name: 'Laptop Çantası',      sku: 'SKU-003', category: 'Aksesuar',   price: 450.00 },
    { id: 4, name: 'USB Hub 4 Port',      sku: 'SKU-004', category: 'Elektronik', price: 199.50 },
    { id: 5, name: 'Kablosuz Mouse',      sku: 'SKU-005', category: 'Elektronik', price: 350.00 },
  ],
  stores: [
    { id: 1, name: 'Mağaza A – Kadıköy',       city: 'İstanbul', is_active: true },
    { id: 2, name: 'Mağaza B – Beşiktaş',      city: 'İstanbul', is_active: true },
    { id: 3, name: 'Mağaza C – Ankara Merkez', city: 'Ankara',   is_active: true },
    { id: 4, name: 'Mağaza D – İzmir Alsancak',city: 'İzmir',    is_active: true },
  ],
  inventory: [
    { id:1,  store_id:1, product_id:1, quantity:2  },
    { id:2,  store_id:1, product_id:2, quantity:15 },
    { id:3,  store_id:1, product_id:3, quantity:30 },
    { id:4,  store_id:2, product_id:1, quantity:48 },
    { id:5,  store_id:2, product_id:2, quantity:5  },
    { id:6,  store_id:2, product_id:4, quantity:60 },
    { id:7,  store_id:3, product_id:1, quantity:20 },
    { id:8,  store_id:3, product_id:3, quantity:8  },
    { id:9,  store_id:3, product_id:5, quantity:35 },
    { id:10, store_id:4, product_id:2, quantity:40 },
    { id:11, store_id:4, product_id:4, quantity:12 },
    { id:12, store_id:4, product_id:5, quantity:3  },
  ],
  requests: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stockLevel(q) {
  return q < 10 ? 'critical' : q < 25 ? 'low' : 'normal';
}

// Tiny JWT – base64url only (demo, not cryptographic)
function b64(s) { return Buffer.from(s).toString('base64url'); }
function jwtSign(payload) {
  const h = b64(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const p = b64(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400e3 }));
  return `${h}.${p}.sig`;
}
function jwtVerify(token) {
  try {
    const [, p] = (token || '').split('.');
    const data = JSON.parse(Buffer.from(p, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch { return null; }
}

function findMatches(reqStoreId, productId, qty) {
  const reqCity = (db.stores.find(s => s.id === reqStoreId) || {}).city;
  return db.inventory
    .filter(i => i.product_id === productId && i.store_id !== reqStoreId && i.quantity > 0)
    .map(i => {
      const store = db.stores.find(s => s.id === i.store_id) || {};
      const excess = i.quantity - qty;
      const reasons = [];
      let score = 10;
      if (excess >= 25)        { score += 40; reasons.push('Fazla stok mevcut'); }
      else if (excess >= 10)   { score += 25; reasons.push('Yeterli stok mevcut'); }
      else if (i.quantity >= qty) { score += 10; reasons.push('Stok karşılanabilir'); }
      if (store.city === reqCity) { score += 30; reasons.push('Aynı şehir'); }
      return { source_store_id: store.id, source_store_name: store.name,
               source_store_city: store.city, available_quantity: i.quantity, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); }
    });
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':  'application/json',
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  res.end(json);
}

function getUser(req) {
  const token = (req.headers.authorization || '').split(' ')[1];
  return jwtVerify(token);
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

  const parsed   = url.parse(req.url, true);
  const path     = parsed.pathname;
  const query    = parsed.query;
  const method   = req.method;
  const segments = path.split('/').filter(Boolean); // ['api','products','5']

  // ── Health ────────────────────────────────────────────────────────────────
  if (path === '/health') { send(res, 200, { status: 'ok', mode: 'in-memory' }); return; }

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === '/api/auth/login' && method === 'POST') {
    const { email, password } = await readBody(req);
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) { send(res, 401, { error: 'E-posta veya şifre hatalı' }); return; }
    const token = jwtSign({ id: user.id, email: user.email, role: user.role });
    send(res, 200, { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    return;
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const u = getUser(req);
    if (!u) { send(res, 401, { error: 'Token gerekli' }); return; }
    const user = db.users.find(x => x.id === u.id);
    send(res, 200, { id: user.id, email: user.email, name: user.name, role: user.role });
    return;
  }

  // All routes below require auth
  const me = getUser(req);
  if (!me) { send(res, 401, { error: 'Token gerekli' }); return; }

  // ── Products ──────────────────────────────────────────────────────────────
  if (segments[1] === 'products') {
    const pid = segments[2] ? parseInt(segments[2]) : null;

    if (!pid && method === 'GET')  { send(res, 200, db.products); return; }
    if (!pid && method === 'POST') {
      const b = await readBody(req);
      if (!b.name || !b.sku) { send(res, 400, { error: 'Eksik alan' }); return; }
      const p = { id: nextId('products'), name: b.name, sku: b.sku, category: b.category || '', price: +b.price || 0 };
      db.products.push(p); send(res, 201, p); return;
    }
    if (pid && method === 'GET') {
      const p = db.products.find(x => x.id === pid);
      p ? send(res, 200, p) : send(res, 404, { error: 'Ürün bulunamadı' }); return;
    }
    if (pid && method === 'PUT') {
      const p = db.products.find(x => x.id === pid);
      if (!p) { send(res, 404, { error: 'Ürün bulunamadı' }); return; }
      const b = await readBody(req);
      Object.assign(p, b); send(res, 200, p); return;
    }
    if (pid && method === 'DELETE') {
      const idx = db.products.findIndex(x => x.id === pid);
      if (idx < 0) { send(res, 404, { error: 'Ürün bulunamadı' }); return; }
      db.products.splice(idx, 1); send(res, 204, {}); return;
    }
  }

  // ── Stores ────────────────────────────────────────────────────────────────
  if (segments[1] === 'stores') {
    const sid = segments[2] ? parseInt(segments[2]) : null;
    if (!sid && method === 'GET')  { send(res, 200, db.stores); return; }
    if (!sid && method === 'POST') {
      const b = await readBody(req);
      const s = { id: nextId('stores'), name: b.name, city: b.city, is_active: b.is_active !== false };
      db.stores.push(s); send(res, 201, s); return;
    }
    if (sid && method === 'GET') {
      const s = db.stores.find(x => x.id === sid);
      s ? send(res, 200, s) : send(res, 404, { error: 'Mağaza bulunamadı' }); return;
    }
    if (sid && method === 'PUT') {
      const s = db.stores.find(x => x.id === sid);
      if (!s) { send(res, 404, { error: 'Mağaza bulunamadı' }); return; }
      Object.assign(s, await readBody(req)); send(res, 200, s); return;
    }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  if (segments[1] === 'inventory') {
    // /api/inventory/stats
    if (segments[2] === 'stats' && method === 'GET') {
      const qs = db.inventory.map(i => i.quantity);
      send(res, 200, {
        total_products: db.products.length,
        active_stores:  db.stores.filter(s => s.is_active).length,
        critical_stock: qs.filter(q => q < 10).length,
        low_stock:      qs.filter(q => q >= 10 && q < 25).length,
        normal_stock:   qs.filter(q => q >= 25).length,
      }); return;
    }
    // /api/inventory  (GET)
    if (!segments[2] && method === 'GET') {
      let rows = db.inventory;
      if (query.store_id) rows = rows.filter(i => i.store_id === +query.store_id);
      const result = rows.map(i => {
        const store   = db.stores.find(s => s.id === i.store_id)    || {};
        const product = db.products.find(p => p.id === i.product_id) || {};
        return { ...i, store_name: store.name, store_city: store.city,
                 product_name: product.name, product_sku: product.sku,
                 category: product.category, price: product.price,
                 stock_level: stockLevel(i.quantity) };
      });
      send(res, 200, result); return;
    }
    // /api/inventory/:store_id/:product_id  (PATCH)
    if (segments[2] && segments[3] && method === 'PATCH') {
      const storeId = parseInt(segments[2]), prodId = parseInt(segments[3]);
      const { quantity } = await readBody(req);
      let row = db.inventory.find(i => i.store_id === storeId && i.product_id === prodId);
      if (row) row.quantity = quantity;
      else { row = { id: nextId('inventory'), store_id: storeId, product_id: prodId, quantity }; db.inventory.push(row); }
      send(res, 200, { ...row, stock_level: stockLevel(quantity) }); return;
    }
  }

  // ── Matching ──────────────────────────────────────────────────────────────
  if (path === '/api/match-request' && method === 'POST') {
    const { requesting_store_id, product_id, quantity_needed } = await readBody(req);
    const store   = db.stores.find(s => s.id === requesting_store_id);
    const product = db.products.find(p => p.id === product_id);
    const request = { id: nextId('requests'), requesting_store_id, product_id,
                      quantity_needed, status: 'pending',
                      created_at: new Date().toISOString(),
                      store_name: store?.name, product_name: product?.name, sku: product?.sku };
    const matches = findMatches(requesting_store_id, product_id, quantity_needed);
    if (matches.length) request.status = 'fulfilled';
    db.requests.push(request);
    send(res, 201, { request, matches }); return;
  }
  if (path === '/api/requests' && method === 'GET') {
    send(res, 200, [...db.requests].reverse()); return;
  }
  if (path.startsWith('/api/requests/') && path.endsWith('/matches') && method === 'GET') {
    const rid = parseInt(segments[2]);
    const r = db.requests.find(x => x.id === rid);
    if (!r) { send(res, 404, { error: 'Talep bulunamadı' }); return; }
    send(res, 200, findMatches(r.requesting_store_id, r.product_id, r.quantity_needed)); return;
  }

  send(res, 404, { error: 'Route bulunamadı', path });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════╗');
  console.log('  ║   SmartShelf Demo API çalışıyor  ✅    ║');
  console.log('  ║   http://localhost:' + PORT + '              ║');
  console.log('  ║   Mod: in-memory (npm install yok)     ║');
  console.log('  ║   admin@smartshelf.com / admin123      ║');
  console.log('  ╚════════════════════════════════════════╝');
  console.log('');
});
