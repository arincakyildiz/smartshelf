import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SmartShelf API',
      version: '1.0.0',
      description: 'Akıllı Ürün Eşleştirme ve Stok Takip Sistemi REST API',
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Dev' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          properties: { email: { type: 'string' }, password: { type: 'string' } },
          required: ['email', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { type: 'object' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            sku: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
          },
        },
        Store: {
          type: 'object',
          properties: {
            id: { type: 'string' }, name: { type: 'string' },
            city: { type: 'string' }, is_active: { type: 'boolean' },
          },
        },
        Transfer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            source_store_id: { type: 'string' },
            target_store_id: { type: 'string' },
            product_id: { type: 'string' },
            quantity: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Giriş', security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } } },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Yeni kullanıcı kaydı (admin)',
          responses: { '201': { description: 'Created' } },
        },
      },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Mevcut kullanıcı', responses: { '200': { description: 'OK' } } } },

      '/products':         { get:  { tags: ['Products'], summary: 'Ürün listesi',         responses: { '200': { description: 'OK' } } } },
      '/products/{id}':    { get:  { tags: ['Products'], summary: 'Ürün detay',           responses: { '200': { description: 'OK' } } } },

      '/stores':           { get:  { tags: ['Stores'],   summary: 'Mağaza listesi',       responses: { '200': { description: 'OK' } } } },

      '/inventory':                    { get: { tags: ['Inventory'], summary: 'Tüm envanter', responses: { '200': { description: 'OK' } } } },
      '/inventory/stats':              { get: { tags: ['Inventory'], summary: 'Dashboard stats', responses: { '200': { description: 'OK' } } } },
      '/inventory/excess-stores':      { get: { tags: ['Inventory'], summary: 'Fazla stoklu mağazalar', responses: { '200': { description: 'OK' } } } },
      '/inventory/products-with-stock':{ get: { tags: ['Inventory'], summary: 'Ürün + toplam stok', responses: { '200': { description: 'OK' } } } },
      '/inventory/history':            { get: { tags: ['Inventory'], summary: 'Stok değişiklik geçmişi', responses: { '200': { description: 'OK' } } } },

      '/match-request':         { post: { tags: ['Matching'], summary: 'Stok talebi oluştur + eşleştir', responses: { '201': { description: 'Created' } } } },
      '/requests':              { get:  { tags: ['Matching'], summary: 'Talepler listesi', responses: { '200': { description: 'OK' } } } },
      '/requests/{id}/matches': { get:  { tags: ['Matching'], summary: 'Eşleşme sonuçları', responses: { '200': { description: 'OK' } } } },

      '/transfers':       { get:  { tags: ['Transfers'], summary: 'Transfer listesi', responses: { '200': { description: 'OK' } } },
                            post: { tags: ['Transfers'], summary: 'Yeni transfer talebi', responses: { '201': { description: 'Created' } } } },
      '/transfers/{id}':  { patch:{ tags: ['Transfers'], summary: 'Onay/Red/Tamamlama (admin)', responses: { '200': { description: 'OK' } } } },
    },
  },
  apis: [],
});
