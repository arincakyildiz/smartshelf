import { InventoryHistory, ActionType } from '../models';
import mongoose from 'mongoose';

interface LogEntry {
  store_id: string | mongoose.Types.ObjectId;
  product_id: string | mongoose.Types.ObjectId;
  action_type: ActionType;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  actor_id?: string | mongoose.Types.ObjectId;
  related_transfer_id?: string | mongoose.Types.ObjectId;
}

export async function logInventoryChange(entry: LogEntry): Promise<void> {
  await InventoryHistory.create({
    ...entry,
    quantity_changed: entry.new_quantity - entry.previous_quantity,
  });
}
