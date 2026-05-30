'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { InventoryItem, Store, Product } from '@/types';
import { useT } from '@/lib/i18n';
import { getStockLevel } from '@/lib/stock';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

const LEVEL_MAP = {
  critical: { labelKey: 'inventory.levelCritical', cls: 'badge-critical' },
  low:      { labelKey: 'inventory.levelLow',      cls: 'badge-low' },
  normal:   { labelKey: 'inventory.levelNormal',   cls: 'badge-normal' },
};

export default function InventoryPage() {
  const t = useT();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState('');

  const fetchInventory = useCallback(async () => {
    try {
      const params = selectedStore ? `?store_id=${selectedStore}` : '';
      const { data } = await api.get(`/inventory${params}`);
      setInventory(data);
    } catch {
      toast.error(t('inventory.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedStore, t]);

  useEffect(() => {
    api.get('/stores').then(({ data }) => {
      setStores(Array.isArray(data) ? data : data.items);
    });
    api.get('/products?limit=1000').then(({ data }) => {
      setProducts(Array.isArray(data) ? data : data.items);
    });
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // Real-time: stok güncellemelerinde otomatik yenile
  useEffect(() => {
    const socket = io(WS_URL, { auth: { token: localStorage.getItem('token') } });
    socket.on('inventory:update', () => fetchInventory());
    return () => { socket.disconnect(); };
  }, [fetchInventory]);

  async function handleUpdate(item: InventoryItem) {
    const qty = Number(newQty);
    if (isNaN(qty) || qty < 0) { toast.error(t('inventory.invalidQty')); return; }
    try {
      await api.patch(`/inventory/${item.store_id}/${item.product_id}`, { quantity: qty });
      toast.success(t('inventory.updated'));
      setEditRow(null);
      fetchInventory();
    } catch {
      toast.error(t('inventory.updateFailed'));
    }
  }

  // Bir mağaza seçiliyse tüm ürünleri göster: stok satırı olmayanlar miktar 0 ile
  // listelenir, böylece yeni eklenen ürünlere de stok girilebilir.
  let rows: InventoryItem[] = inventory;
  if (selectedStore) {
    const store = stores.find((s) => s.id === selectedStore);
    const byProduct = new Map(inventory.map((i) => [i.product_id, i]));
    rows = products.map((p) => {
      const existing = byProduct.get(p.id);
      if (existing) return existing;
      return {
        id: `new-${p.id}`,
        store_id: selectedStore,
        product_id: p.id,
        quantity: 0,
        store_name: store?.name ?? '',
        store_city: store?.city ?? '',
        product_name: p.name,
        product_sku: p.sku,
        category: p.category,
        price: p.price,
        stock_level: getStockLevel(0),
      };
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('inventory.subtitle')}</p>
        </div>
        <select
          className="input w-56"
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          <option value="">{t('inventory.allStores')}</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">{t('common.product')}</th>
                <th className="pb-3 font-medium">{t('common.sku')}</th>
                <th className="pb-3 font-medium">{t('common.store')}</th>
                <th className="pb-3 font-medium">{t('common.city')}</th>
                <th className="pb-3 font-medium">{t('common.qty')}</th>
                <th className="pb-3 font-medium">{t('inventory.colStatus')}</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((item) => {
                const level = LEVEL_MAP[item.stock_level];
                const isEditing = editRow?.id === item.id;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{item.product_name}</td>
                    <td className="py-3 text-gray-500 font-mono text-xs">{item.product_sku}</td>
                    <td className="py-3 text-gray-700">{item.store_name}</td>
                    <td className="py-3 text-gray-500">{item.store_city}</td>
                    <td className="py-3">
                      {isEditing ? (
                        <input
                          className="input w-20 py-1"
                          type="number"
                          min="0"
                          value={newQty}
                          onChange={(e) => setNewQty(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold">{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={level.cls}>{t(level.labelKey)}</span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleUpdate(item)} className="text-green-600 hover:text-green-800 text-xs font-medium">{t('common.save')}</button>
                          <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-gray-600 text-xs">{t('common.cancel')}</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditRow(item); setNewQty(String(item.quantity)); }} className="text-navy-600 hover:text-navy-800 text-xs font-medium">{t('inventory.update')}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
