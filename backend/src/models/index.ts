import mongoose, { Schema, model, Document } from 'mongoose';

mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserDoc extends Document {
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    email:         { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    name:          { type: String, required: true },
    role:          { type: String, default: 'admin' },
    created_at:    { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

export const User = model<UserDoc>('User', userSchema);

// ─── Product ──────────────────────────────────────────────────────────────────
export interface ProductDoc extends Document {
  name: string;
  sku: string;
  category: string;
  price: number;
  created_at: Date;
  updated_at: Date;
}

const productSchema = new Schema<ProductDoc>(
  {
    name:       { type: String, required: true },
    sku:        { type: String, required: true, unique: true, index: true },
    category:   { type: String, required: true },
    price:      { type: Number, required: true, min: 0 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'products' }
);

productSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const Product = model<ProductDoc>('Product', productSchema);

// ─── Store ────────────────────────────────────────────────────────────────────
export interface StoreDoc extends Document {
  name: string;
  city: string;
  is_active: boolean;
  created_at: Date;
}

const storeSchema = new Schema<StoreDoc>(
  {
    name:       { type: String, required: true },
    city:       { type: String, required: true, index: true },
    is_active:  { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'stores' }
);

export const Store = model<StoreDoc>('Store', storeSchema);

// ─── Inventory ────────────────────────────────────────────────────────────────
export interface InventoryDoc extends Document {
  store_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  updated_at: Date;
}

const inventorySchema = new Schema<InventoryDoc>(
  {
    store_id:   { type: Schema.Types.ObjectId, ref: 'Store',   required: true, index: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity:   { type: Number, required: true, min: 0, default: 0 },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'inventory' }
);

inventorySchema.index({ store_id: 1, product_id: 1 }, { unique: true });

export const Inventory = model<InventoryDoc>('Inventory', inventorySchema);

// ─── Stock Request ────────────────────────────────────────────────────────────
export interface StockRequestDoc extends Document {
  requesting_store_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity_needed: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  created_at: Date;
}

const stockRequestSchema = new Schema<StockRequestDoc>(
  {
    requesting_store_id: { type: Schema.Types.ObjectId, ref: 'Store',   required: true, index: true },
    product_id:          { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity_needed:     { type: Number, required: true, min: 1 },
    status:              { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
    created_at:          { type: Date, default: Date.now },
  },
  { collection: 'stock_requests' }
);

export const StockRequest = model<StockRequestDoc>('StockRequest', stockRequestSchema);

// ─── Match Result ─────────────────────────────────────────────────────────────
export interface MatchResultDoc extends Document {
  request_id: mongoose.Types.ObjectId;
  source_store_id: mongoose.Types.ObjectId;
  score: number;
  available_quantity: number;
  reasons: string[];
  created_at: Date;
}

const matchResultSchema = new Schema<MatchResultDoc>(
  {
    request_id:         { type: Schema.Types.ObjectId, ref: 'StockRequest', required: true, index: true },
    source_store_id:    { type: Schema.Types.ObjectId, ref: 'Store',        required: true },
    score:              { type: Number, required: true },
    available_quantity: { type: Number, required: true },
    reasons:            { type: [String], default: [] },
    created_at:         { type: Date, default: Date.now },
  },
  { collection: 'match_results' }
);

export const MatchResult = model<MatchResultDoc>('MatchResult', matchResultSchema);
