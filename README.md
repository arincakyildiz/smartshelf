# SmartShelf

Mağazalar arası stok takibi ve ürün eşleştirme platformu. Vena yazılım mühendisi teknik case'i için geliştirildi.

Bir mağazada stok bittiğinde, aynı ürünü elinde bulunduran diğer mağazalar arasından en uygun kaynağı puanlayarak öneren; stok hareketlerini mağazalar arası transfer akışıyla yöneten bir sistem. Backend Express + MongoDB, frontend Next.js.

## Kullanılan teknolojiler

| Katman | Seçim | Not |
|--------|-------|-----|
| Frontend | Next.js 14 (App Router), React 18, TypeScript | Tailwind ile tasarım, Recharts ile grafikler |
| Backend | Node.js, Express 4, TypeScript | Zod ile istek doğrulama |
| Veritabanı | MongoDB 7 + Mongoose | |
| Cache | Redis (ioredis) | Redis yoksa ioredis-mock ile bellek içi fallback |
| Kimlik doğrulama | JWT (Bearer) + bcrypt | Rol bazlı yetki (admin / store_manager) |
| Gerçek zamanlı | Socket.io | Stok ve transfer değişikliklerinde canlı güncelleme |
| Test | Jest + Supertest | 54 test, 6 suite |
| API dokümantasyonu | Swagger (OpenAPI 3) | `/api-docs` altında |
| Container | Docker + Docker Compose | |

## Kurulum

İki yol var: Docker ile tek komutta ayağa kaldırmak ya da servisleri elle çalıştırmak.

### Docker ile

MongoDB ve Redis dahil her şey container içinde çalışır, ayrıca bir şey kurmaya gerek yok.

```bash
docker compose up --build
```

Frontend `http://localhost:3000`, API `http://localhost:4000` üzerinden gelir. Compose dosyasındaki ortam değişkenleri geliştirme için yeterli; production'da en azından `JWT_SECRET` değiştirilmeli.

### Elle çalıştırma

Önce yerel bir MongoDB gerekiyor (https://www.mongodb.com/try/download/community). Redis kurmak istemezseniz `.env` içinde `USE_INMEMORY_REDIS=true` yapmanız yeterli; cache bellek içinde çalışır.

Backend:

```bash
cd backend
npm install
cp .env.example .env       # MONGODB_URI ve JWT_SECRET değerlerini kontrol edin
npm run dev
```

Frontend (ayrı terminal):

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

İlk açılışta veritabanı boşsa otomatik seed edilir: 6 mağaza, 22 ürün, 42 stok satırı, 2 stok talebi, 3 transfer ve 3 kullanıcı. Veritabanında kullanıcı varsa seed atlanır, yani mevcut veriyi ezmez.

### Servis adresleri

| Servis | Adres |
|--------|-------|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api-docs |
| MongoDB | mongodb://localhost:27017/smartshelf |
| Redis | redis://localhost:6379 |

### Demo hesapları

| E-posta | Şifre | Rol |
|---------|-------|-----|
| admin@smartshelf.com | admin123 | admin |
| manager.a@smartshelf.com | manager123 | Mağaza A yöneticisi |
| manager.b@smartshelf.com | manager123 | Mağaza B yöneticisi |

Admin tüm mağazaları görür ve değiştirir. Mağaza yöneticisi yalnızca kendi mağazasının stoğunu görüp güncelleyebilir, transfer talebini de yalnızca kendi mağazasından açabilir.

## Mimari kararlar

**Neden MongoDB.** İlk denemede PostgreSQL + Prisma ile gidildi ama eşleştirme sonuçlarındaki değişken alanlar (her eşleşmenin kendi `reasons` listesi gibi) ve mağaza/stok verisinin doküman halinde tutulmasının daha doğal olması nedeniyle MongoDB'ye geçildi. Mağaza ve ürün başına toplam stok, fazla stoklu mağazalar gibi türetilmiş veriler tek tek sorgu yerine aggregation pipeline ile hesaplanıyor (`/inventory/excess-stores`, `/inventory/products-with-stock`). ObjectId'ler API sınırında string'e çevrilir; frontend hiçbir yerde ObjectId formatı bilmek zorunda değil.

**Eşleştirme puanlaması.** Talep edilen ürünü stoğunda bulunduran aktif mağazalar puanlanır: stok karşılanabiliyorsa +10, istenenden 10-24 fazlaysa +25, 25 ve üzeri fazlaysa +40, talep eden mağazayla aynı şehirdeyse +30, ayrıca her aday için +10 baz puan. Sonuç puana göre sıralı döner. Mantık `services/matchingService.ts` içinde izole, böylece kurallar değişse bile controller'a dokunmaya gerek yok.

**Cache ve invalidation.** Sık okunan ve nispeten yavaş değişen uç noktalar (envanter, dashboard istatistikleri, stoklu ürün listesi) Redis'te 30-120 saniye TTL ile tutulur. Stok güncellendiğinde ya da transfer tamamlandığında ilgili anahtarlar (`inventory:*`, `dashboard:stats`, `products:with-stock`) temizlenir, böylece kullanıcı bayat veri görmez. Redis erişilemezse sistem çökmesin diye ioredis-mock ile bellek içi bir fallback var.

**Geri uyumlu sayfalama.** Liste uçları parametre almazsa düz dizi, `page`/`limit` aldığında `{ items, total, page, limit, total_pages }` döndürür. Bu sayede dropdown'ları besleyen "hepsini getir" çağrıları ile tablo görünümündeki sayfalı çağrılar aynı endpoint'i kullanabiliyor; eski tüketicileri bozmadan sayfalama eklendi.

**Rol bazlı yetki.** Yazma uçları `requireRole('admin')` ile korunuyor (ürün/mağaza CRUD, transfer onay-red-tamamlama, kullanıcı kaydı). Mağaza kapsamı `canAccessStore` yardımcısıyla zorlanıyor: admin her mağazaya erişir, yönetici yalnızca kendi mağazasına. Bu kontrol middleware yerine controller içinde, çünkü envanter okumasında "reddet" değil "kendi mağazasına filtrele" davranışı gerekiyor.

**Gerçek zamanlı güncelleme.** Stok değişiminde sunucu tüm bağlı istemcilere `inventory:update`, transfer durumu değişince `transfer:created` / `transfer:status` olaylarını yayınlar. Dashboard, envanter ve transfer ekranları bu olayları dinleyip otomatik yeniler; iki kullanıcı aynı anda çalışırken ekranlar tutarlı kalır.

**Brute force koruması.** Rate limit yalnızca `/api/auth/login` üzerinde (15 dakikada 20 deneme). Tüm API'ye genel limit konmadı, çünkü normal kullanımda tablo ve dropdown'lar kısa sürede çok sayıda istek atabiliyor.

## API uç noktaları

```
POST   /api/auth/login
POST   /api/auth/register          (admin)
GET    /api/auth/me

GET    /api/products               (arama, kategori, sıralama, sayfalama)
GET    /api/products/categories
GET    /api/products/:id
POST   /api/products               (admin)
PUT    /api/products/:id           (admin)
DELETE /api/products/:id           (admin)

GET    /api/stores                 (arama, şehir, aktiflik filtresi)
GET    /api/stores/cities
GET    /api/stores/:id
POST   /api/stores                 (admin)
PUT    /api/stores/:id             (admin)
DELETE /api/stores/:id             (admin, bağımlı kayıt varsa 409; ?force=true ile zincirleme siler)

GET    /api/inventory?store_id=
GET    /api/inventory/stats
GET    /api/inventory/excess-stores
GET    /api/inventory/products-with-stock
GET    /api/inventory/history      (mağaza, ürün, işlem tipi filtresi + sayfalama)
PATCH  /api/inventory/:store_id/:product_id

POST   /api/transfers
GET    /api/transfers              (durum, mağaza, tarih filtresi + sayfalama)
PATCH  /api/transfers/:id          (admin; approve / reject / complete)

POST   /api/match-request
GET    /api/requests
GET    /api/requests/:id/matches
```

Tam istek/yanıt şemaları için Swagger arayüzüne (`/api-docs`) bakılabilir.

## Test

```bash
cd backend
npm test
```

54 test, 6 suite halinde: eşleştirme algoritması, JWT giriş akışı, ürün CRUD, stok seviyesi sınırları, rol/mağaza kapsamı kontrolü ve hata yönetimi (async hata iletimi + Mongoose hata eşleme). Testler veritabanı ve Redis'i mock'lar, çalışan bir MongoDB gerektirmez.

## Referans tablolar

Stok seviyeleri (case dokümanındaki eşiklere göre):

| Miktar | Seviye |
|--------|--------|
| 10'dan az | Kritik |
| 10 - 24 | Düşük |
| 25 ve üzeri | Normal |
| 50 ve üzeri | Fazla |

Eşleştirme puanı örneği: Mağaza A (İstanbul) bir üründen 2 adet istiyor, Mağaza B (İstanbul) aynı üründen 48 adet tutuyor. Mağaza B'nin puanı baz 10 + fazla stok 40 + aynı şehir 30 = 80.

## Proje yapısı

```
backend/
  src/
    controllers/   istek işleme
    services/      eşleştirme ve geçmiş kaydı mantığı
    middleware/    auth, rol/kapsam, hata yakalama
    models/        Mongoose şemaları
    config/        veritabanı, redis, swagger
    utils/         sayfalama yardımcıları
  tests/
frontend/
  app/(dashboard)/ dashboard, inventory, products, stores, transfers, requests, history
  components/      ui, layout, dashboard grafikleri
  lib/             axios örneği (token interceptor)
  types/
docker-compose.yml
```
