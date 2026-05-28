import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Server as SocketServer } from 'socket.io';
import { Transfer, Inventory } from '../models';
import { cache } from '../config/redis';
import { logInventoryChange } from '../services/historyService';
import { parsePagination, parseSort, paginated } from '../utils/paginate';

let io: SocketServer | null = null;
export function setSocketServerTransfer(socketIO: SocketServer): void {
  io = socketIO;
}

const createSchema = z.object({
  source_store_id: z.string().min(1),
  target_store_id: z.string().min(1),
  product_id: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

function emit(event: string, payload: unknown) {
  if (io) io.emit(event, payload);
}

async function invalidateCache() {
  await cache.delPattern('inventory:*');
  await cache.del('dashboard:stats');
  await cache.del('products:with-stock');
}

// POST /api/transfers
export async function createTransfer(req: Request, res: Response): Promise<void> {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Geçersiz istek', details: parsed.error.issues });
    return;
  }
  const { source_store_id, target_store_id, product_id, quantity, notes } = parsed.data;

  if (source_store_id === target_store_id) {
    res.status(400).json({ error: 'Kaynak ve hedef mağaza aynı olamaz' });
    return;
  }

  // Verify source has enough stock
  const sourceInv = await Inventory.findOne({ store_id: source_store_id, product_id });
  if (!sourceInv || sourceInv.quantity < quantity) {
    res.status(400).json({
      error: 'Kaynak mağazada yeterli stok yok',
      available: sourceInv?.quantity ?? 0,
    });
    return;
  }

  const transfer = await Transfer.create({
    source_store_id, target_store_id, product_id, quantity, notes,
    created_by: req.user?.id,
  });

  emit('transfer:created', { id: transfer.id, status: 'PENDING' });
  res.status(201).json(transfer);
}

// GET /api/transfers?status=&store_id=&page=&limit=
export async function listTransfers(req: Request, res: Response): Promise<void> {
  const { status, store_id, date_from, date_to } = req.query as Record<string, string | undefined>;
  const p = parsePagination(req);
  const { sort_by, sort_dir } = parseSort(req, 'created_at', 'desc');

  const filter: any = {};
  if (status)   filter.status = status;
  if (store_id) filter.$or = [{ source_store_id: store_id }, { target_store_id: store_id }];
  if (date_from || date_to) {
    filter.created_at = {};
    if (date_from) filter.created_at.$gte = new Date(date_from);
    if (date_to)   filter.created_at.$lte = new Date(date_to);
  }

  const query = Transfer.find(filter)
    .populate<{ source_store_id: any }>('source_store_id', 'name city')
    .populate<{ target_store_id: any }>('target_store_id', 'name city')
    .populate<{ product_id: any }>('product_id', 'name sku')
    .sort({ [sort_by]: sort_dir });

  const total = p.isPaginated ? await Transfer.countDocuments(filter) : 0;
  const rows = p.isPaginated
    ? await query.skip(p.skip).limit(p.limit).lean()
    : await query.lean();

  const mapped = rows.map((t: any) => ({
    id:               t._id.toString(),
    source_store_id:  t.source_store_id?._id?.toString(),
    source_store_name:t.source_store_id?.name,
    source_store_city:t.source_store_id?.city,
    target_store_id:  t.target_store_id?._id?.toString(),
    target_store_name:t.target_store_id?.name,
    target_store_city:t.target_store_id?.city,
    product_id:       t.product_id?._id?.toString(),
    product_name:     t.product_id?.name,
    product_sku:      t.product_id?.sku,
    quantity:         t.quantity,
    status:           t.status,
    notes:            t.notes,
    created_at:       t.created_at,
    approved_at:      t.approved_at,
    completed_at:     t.completed_at,
  }));

  res.json(p.isPaginated ? paginated(mapped, total, p) : mapped);
}

// PATCH /api/transfers/:id  – approve / reject / complete
const updateSchema = z.object({
  action: z.enum(['approve', 'reject', 'complete']),
  notes: z.string().optional(),
});

export async function updateTransfer(req: Request, res: Response): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'Geçersiz ID' }); return;
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Geçersiz aksiyon' }); return; }
  const { action } = parsed.data;

  const transfer = await Transfer.findById(req.params.id);
  if (!transfer) { res.status(404).json({ error: 'Transfer bulunamadı' }); return; }

  switch (action) {
    case 'approve':
      if (transfer.status !== 'PENDING') {
        res.status(400).json({ error: 'Sadece PENDING transferler onaylanabilir' }); return;
      }
      transfer.status = 'APPROVED';
      transfer.approved_at = new Date();
      transfer.approved_by = req.user?.id as any;
      break;

    case 'reject':
      if (transfer.status !== 'PENDING') {
        res.status(400).json({ error: 'Sadece PENDING transferler reddedilebilir' }); return;
      }
      transfer.status = 'REJECTED';
      break;

    case 'complete': {
      if (transfer.status !== 'APPROVED') {
        res.status(400).json({ error: 'Sadece APPROVED transferler tamamlanabilir' }); return;
      }
      // Move stock
      const src = await Inventory.findOne({
        store_id: transfer.source_store_id, product_id: transfer.product_id,
      });
      if (!src || src.quantity < transfer.quantity) {
        res.status(400).json({ error: 'Kaynak stok yetersiz' }); return;
      }
      const srcOld = src.quantity;
      src.quantity -= transfer.quantity;
      await src.save();

      // Target inventory: var ise $inc, yoksa create (atomic upsert)
      const tgt = await Inventory.findOneAndUpdate(
        { store_id: transfer.target_store_id, product_id: transfer.product_id },
        { $inc: { quantity: transfer.quantity }, $set: { updated_at: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const tgtNew = tgt.quantity;
      const tgtOld = tgtNew - transfer.quantity;

      transfer.status = 'COMPLETED';
      transfer.completed_at = new Date();

      // Audit log – kaynaktan çıktı, hedefe geldi
      await logInventoryChange({
        store_id: transfer.source_store_id, product_id: transfer.product_id,
        action_type: 'TRANSFER_SENT',
        previous_quantity: srcOld, new_quantity: src.quantity,
        related_transfer_id: transfer.id, actor_id: req.user?.id,
      });
      await logInventoryChange({
        store_id: transfer.target_store_id, product_id: transfer.product_id,
        action_type: 'TRANSFER_RECEIVED',
        previous_quantity: tgtOld, new_quantity: tgtNew,
        related_transfer_id: transfer.id, actor_id: req.user?.id,
      });

      await invalidateCache();
      emit('inventory:update', {
        store_id: transfer.source_store_id.toString(),
        product_id: transfer.product_id.toString(),
        quantity: src.quantity,
      });
      emit('inventory:update', {
        store_id: transfer.target_store_id.toString(),
        product_id: transfer.product_id.toString(),
        quantity: tgtNew,
      });
      break;
    }
  }

  await transfer.save();
  emit('transfer:status', { id: transfer.id, status: transfer.status });
  res.json(transfer);
}
