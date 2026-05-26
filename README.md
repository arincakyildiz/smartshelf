# SmartShelf

Akıllı Ürün Eşleştirme ve Stok Takip Sistemi — Vena Yazılım Mühendisi Teknik Case

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Veritabanı | PostgreSQL |
| Cache | Redis |
| Auth | JWT (Bearer token) |
| Realtime | Socket.io |
| Test | Jest + Supertest |
| Container | Docker + Docker Compose |

## Mimari Kararlar

- **Monorepo yapısı**: `backend/` ve `frontend/` ayrı Node projeleri, Docker Compose ile orkestrasyonu tek yerden.
- **PostgreSQL**: İlişkisel veri modeli; store–product–inventory arasındaki JOIN'ler için uygun.
- **Redis cache**: `/products`, `/stores`, `/inventory` endpoint'leri 30–120 sn TTL ile cache'lenir; stok güncellenince ilgili anahtarlar invalidate edilir.
- **Match Scoring**: Puan tabanlı eşleştirme (fazla stok +40, yeterli +25, aynı şehir +30, base +10). Sonuçlar skor sırasıyla döner.
- **Socket.io**: Her stok güncellemesinde tüm bağlı client'lara `inventory:update` event'i emit edilir; Dashboard gerçek zamanlı güncellenir.

## Hızlı Kurulum (Docker)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

| Servis | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Manuel Kurulum

### Backend

```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL ve REDIS_URL'yi doldurun
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Demo Hesabı

```
E-posta: admin@smartshelf.com
Şifre:   admin123
```

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

## Stok Seviyeleri

| Aralık | Seviye |
|--------|--------|
| < 10 | Kritik |
| 10 – 24 | Düşük |
| 25+ | Normal |

## Bonus Özellikler

- [x] Docker & Docker Compose
- [x] JWT Authentication
- [x] Responsive UI (Tailwind CSS)
- [x] TypeScript (frontend + backend)
- [x] Unit Test (Jest + Supertest)
- [x] Redis Caching
- [x] Gerçek zamanlı stok güncellemesi (Socket.io)
- [x] Match Scoring sistemi
