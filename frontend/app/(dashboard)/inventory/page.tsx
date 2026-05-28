'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { InventoryItem, Store } from '@/types';

const LEVEL_MAP = {
  critical: { label: 'Kritik', cls: 'badge-critical' },
  low:      { label: 'Düşük',  cls: 'badge-low' },
  normal:   { label: 'Normal', cls: 'badge-normal' },
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState('');

  async function fetchInventory() {
    try {
      const params = selectedStore ? `?store_id=${selectedStore}` : '';
      const { data } = await api.get(`/inventory${params}`);
      setInventory(data);
    } catch {
      toast.error('Stok verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/stores').then(({ data }) => {
      setStores(Array.isArray(data) ? data : data.items);
    });
  }, []);

  useEffect(() => { fetchInventory(); }, [selectedStore]);

  async function handleUpdate(item: InventoryItem) {
    const qty = Number(newQty);
    if (isNaN(qty) || qty < 0) { toast.error('Geçerli bir miktar girin'); return; }
    try {
      await api.patch(`/inventory/${item.store_id}/${item.product_id}`, { quantity: qty });
      toast.success('Stok güncellendi');
      setEditRow(null);
      fetchInventory();
    } catch {
      toast.error('Güncelleme başarısız');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Mağaza bazlı stok durumu</p>
        </div>
        <select
          className="input w-56"
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          <option value="">Tüm Mağazalar</option>
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
                <th className="pb-3 font-medium">Ürün</th>
                <th className="pb-3 font-medium">SKU</th>
                <th className="pb-3 font-medium">Mağaza</th>
                <th className="pb-3 font-medium">Şehir</th>
                <th className="pb-3 font-medium">Miktar</th>
                <th className="pb-3 font-medium">Durum</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map((item) => {
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
                      <span className={level.cls}>{level.label}</span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleUpdate(item)} className="text-green-600 hover:text-green-800 text-xs font-medium">Kaydet</button>
                          <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-gray-600 text-xs">İptal</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditRow(item); setNewQty(String(item.quantity)); }} className="text-navy-600 hover:text-navy-800 text-xs font-medium">Güncelle</button>
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
