# SmartShelf

Akıllı Ürün Eşleştirme ve Stok Takip Sistemi — Vena Yazılım Mühendisi Teknik Case

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Veritabanı | **MongoDB** (Mongoose ODM) |
| Cache | Redis (ioredis) — opsiyonel ioredis-mock fallback |
| Auth | JWT (Bearer token) + bcrypt |
| Realtime | Socket.io |
| Test | Jest + Supertest |
| Container | Docker + Docker Compose |

## Mimari Kararlar

- **Monorepo**: `backend/` + `frontend/`, Docker Compose ile orkestrasyon.
- **MongoDB**: Esnek şema (ürün metadata'sı, eşleşme reasons listesi). Aggregation pipeline'lar ile `excess-stores` ve `products-with-stock`. ObjectId'ler API'de string olarak döner.
- **Redis cache**: `/products`, `/stores`, `/inventory` endpoint'leri 30–120 sn TTL ile cache'lenir; stok güncellenince ilgili anahtarlar invalidate edilir.
- **Match Scoring**: Puan tabanlı eşleştirme (fazla stok +40, yeterli +25, aynı şehir +30, base +10).
- **Socket.io**: Her stok güncellemesinde tüm bağlı client'lara `inventory:update` event'i emit edilir.
- **Rate limit**: Sadece `/api/auth/login`'de (brute force koruması, 20 req/15 dk).

## Hızlı Kurulum

### Seçenek A — Docker Compose (önerilen)
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

### Seçenek B — Native
1. MongoDB Community Server'ı kur: https://www.mongodb.com/try/download/community
2. (Opsiyonel) Redis: Linux/Mac native; Windows için `USE_INMEMORY_REDIS=true` yeterli
3. Backend:
   ```bash
   cd backend && npm install
   cp .env.example .env       # MONGODB_URI'yi doldur
   npm run dev
   ```
4. Frontend:
   ```bash
   cd frontend && npm install
   cp .env.example .env.local
   npm run dev
   ```

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |

## Demo Hesabı

```
E-posta: admin@smartshelf.com
Şifre:   admin123
```

İlk çalıştırmada veritabanı otomatik seed edilir: 4 mağaza, 5 ürün, 12 stok satırı.

## API Endpoint'leri

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/stores
POST   /api/stores
PUT    /api/stores/:id

GET    /api/inventory?store_id=
GET    /api/inventory/stats
GET    /api/inventory/excess-stores       # fazla stoklu mağazalar
GET    /api/inventory/products-with-stock # ürün listesi + toplam stok
PATCH  /api/inventory/:store_id/:product_id

POST   /api/match-request
GET    /api/requests
GET    /api/requests/:id/matches
```

## Testler

```bash
cd backend
npm test
```

→ **36 test / 4 suite** (matching algorithm, JWT auth flow, product CRUD, stock level boundaries)

## Stok Seviyeleri (PDF spec)

| Miktar | Seviye |
|--------|--------|
| < 10 | Kritik |
| 10 – 24 | Düşük |
| 25+ | Normal |
| 50+ | Fazla (excess) |

## Match Scoring (PDF örneği)

| Kriter | Puan |
|--------|------|
| Base | +10 |
| Stok karşılanabilir | +10 |
| Yeterli stok (10–24 fazla) | +25 |
| Fazla stok (25+ fazla) | +40 |
| Aynı şehir | +30 |

**Örnek:** Mağaza A (İstanbul) iPhone şarj kablosu 2 adet, Mağaza B (İstanbul) 48 adet → Mağaza B = base 10 + fazla stok 40 + aynı şehir 30 = **80 puan**

## Bonus Özellikler

- [x] Docker & Docker Compose
- [x] JWT Authentication + bcrypt
- [x] Responsive UI (Tailwind + mobil drawer)
- [x] TypeScript (frontend + backend)
- [x] Unit Test (Jest + Supertest, 36 test)
- [x] Redis Caching + invalidation
- [x] Gerçek zamanlı stok güncellemesi (Socket.io)
- [x] Match Scoring sistemi (puanlı algoritma)
