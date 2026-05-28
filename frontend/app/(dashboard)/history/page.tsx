'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { InventoryHistoryItem, ActionType, Store } from '@/types';
import Pagination from '@/components/ui/Pagination';

const ACTION_LABEL: Record<ActionType, { label: string; color: string; icon: string }> = {
  STOCK_ADDED:        { label: 'Stok Eklendi',        color: 'bg-green-100 text-green-700',  icon: '+' },
  TRANSFER_SENT:      { label: 'Transfer Gönderildi', color: 'bg-orange-100 text-orange-700', icon: '↑' },
  TRANSFER_RECEIVED:  { label: 'Transfer Alındı',     color: 'bg-blue-100 text-blue-700',    icon: '↓' },
  MANUAL_UPDATE:      { label: 'Manuel Güncelleme',   color: 'bg-gray-100 text-gray-700',    icon: '✎' },
  SALE:               { label: 'Satış',               color: 'bg-purple-100 text-purple-700',icon: '−' },
};

const LIMIT = 20;

export default function HistoryPage() {
  const [items, setItems] = useState<InventoryHistoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [filterStore, setFilterStore]   = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filterStore)  params.set('store_id', filterStore);
      if (filterAction) params.set('action_type', filterAction);
      const { data } = await api.get(`/inventory/history?${params}`);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      toast.error('Geçmiş yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, filterStore, filterAction]);

  useEffect(() => {
    api.get('/stores').then(({ data }) => {
      setStores(Array.isArray(data) ? data : data.items);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filterStore, filterAction]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Geçmişi</h1>
          <p className="text-gray-500 text-sm mt-1">{total} kayıt</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className="input" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
            <option value="">Tüm Mağazalar</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">Tüm Aksiyonlar</option>
            <option value="STOCK_ADDED">Stok Eklendi</option>
            <option value="TRANSFER_SENT">Transfer Gönderildi</option>
            <option value="TRANSFER_RECEIVED">Transfer Alındı</option>
            <option value="MANUAL_UPDATE">Manuel Güncelleme</option>
            <option value="SALE">Satış</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          {filterStore || filterAction ? 'Filtreye uyan kayıt yok' : 'Henüz kayıt yok'}
        </div>
      ) : (
        <div className="card">
          <ul className="space-y-4">
            {items.map((item) => {
              const meta = ACTION_LABEL[item.action_type];
              const positive = item.quantity_changed > 0;
              return (
                <li key={item.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${meta.color} shrink-0`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {item.product_name} <span className="text-gray-500 text-xs font-mono">({item.product_sku})</span>
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <strong>{item.store_name}</strong> —
                      <span className="ml-1">{item.previous_quantity} → {item.new_quantity}</span>
                      <span className={`ml-2 font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                        ({positive ? '+' : ''}{item.quantity_changed})
                      </span>
                    </div>
                    {item.reason && <p className="text-xs text-gray-500 mt-1">📝 {item.reason}</p>}
                    {item.actor_name && <p className="text-xs text-gray-500 mt-0.5">👤 {item.actor_name}</p>}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('tr-TR')}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
