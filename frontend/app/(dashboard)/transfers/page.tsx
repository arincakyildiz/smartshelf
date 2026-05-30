'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Transfer, TransferStatus, Store, Product } from '@/types';
import Pagination from '@/components/ui/Pagination';
import { useI18n, apiErrorMessage } from '@/lib/i18n';
import { dateLocale } from '@/lib/dictionaries';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

const STATUS_MAP: Record<TransferStatus, { labelKey: string; cls: string }> = {
  PENDING:   { labelKey: 'transfers.statusPending',   cls: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { labelKey: 'transfers.statusApproved',  cls: 'bg-blue-100 text-blue-700'     },
  REJECTED:  { labelKey: 'transfers.statusRejected',  cls: 'bg-red-100 text-red-700'       },
  COMPLETED: { labelKey: 'transfers.statusCompleted', cls: 'bg-green-100 text-green-700'   },
};

const LIMIT = 10;

export default function TransfersPage() {
  const { t, lang } = useI18n();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    source_store_id: '', target_store_id: '', product_id: '', quantity: '', notes: '',
  });

  // Filters & pagination
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStore, setFilterStore]   = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filterStatus) params.set('status', filterStatus);
      if (filterStore)  params.set('store_id', filterStore);
      const { data } = await api.get(`/transfers?${params}`);
      setTransfers(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      toast.error(t('transfers.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterStore, t]);

  // Initial load: stores + products for dropdowns
  useEffect(() => {
    Promise.all([api.get('/stores'), api.get('/products')])
      .then(([s, p]) => {
        setStores(Array.isArray(s.data) ? s.data : s.data.items);
        setProducts(Array.isArray(p.data) ? p.data : p.data.items);
      })
      .catch(() => toast.error(t('common.loadFailed')));
  }, [t]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);
  useEffect(() => { setPage(1); }, [filterStatus, filterStore]);

  // Real-time: transfer ve stok değişikliklerinde otomatik yenile
  useEffect(() => {
    const socket = io(WS_URL, { auth: { token: localStorage.getItem('token') } });
    const refetch = () => fetchTransfers();
    socket.on('transfer:created', refetch);
    socket.on('transfer:status', refetch);
    socket.on('inventory:update', refetch);
    return () => { socket.disconnect(); };
  }, [fetchTransfers]);

  const fetchAll = fetchTransfers;

  async function handleAction(id: string, action: 'approve' | 'reject' | 'complete') {
    try {
      await api.patch(`/transfers/${id}`, { action });
      const successMsg =
        action === 'approve'  ? t('transfers.approved') :
        action === 'reject'   ? t('transfers.rejected') :
                                t('transfers.completed');
      toast.success(successMsg);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      const status = err.response?.status;
      if (msg) {
        toast.error(apiErrorMessage(t, err, 'transfers.actionFailed'));
      } else if (status === 403) {
        toast.error(t('transfers.adminRequired'));
      } else if (status === 404) {
        toast.error(t('transfers.notFound'));
      } else {
        toast.error(t('transfers.actionFailed'));
      }
    } finally {
      // Her durumda yenile - basari/hata fark etmez, UI guncel kalsin
      fetchTransfers();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/transfers', {
        source_store_id: form.source_store_id,
        target_store_id: form.target_store_id,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
      });
      toast.success(t('transfers.createdMsg'));
      setShowModal(false);
      setForm({ source_store_id: '', target_store_id: '', product_id: '', quantity: '', notes: '' });
      fetchAll();
    } catch (err: any) {
      toast.error(apiErrorMessage(t, err, 'transfers.createFailed'));
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('transfers.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('transfers.count', { count: total })}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          {t('transfers.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">{t('transfers.allStatuses')}</option>
            <option value="PENDING">{t('transfers.statusPending')}</option>
            <option value="APPROVED">{t('transfers.statusApproved')}</option>
            <option value="REJECTED">{t('transfers.statusRejected')}</option>
            <option value="COMPLETED">{t('transfers.statusCompleted')}</option>
          </select>
          <select className="input" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
            <option value="">{t('inventory.allStores')}</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transfers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('transfers.none')}</p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">{t('transfers.colSource')}</th>
                <th className="pb-3 font-medium">{t('transfers.colTarget')}</th>
                <th className="pb-3 font-medium">{t('common.product')}</th>
                <th className="pb-3 font-medium">{t('common.qty')}</th>
                <th className="pb-3 font-medium">{t('common.status')}</th>
                <th className="pb-3 font-medium">{t('common.date')}</th>
                <th className="pb-3 font-medium text-right">{t('transfers.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((tr) => {
                const s = STATUS_MAP[tr.status];
                return (
                  <tr key={tr.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{tr.source_store_name}</div>
                      <div className="text-xs text-gray-500">{tr.source_store_city}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{tr.target_store_name}</div>
                      <div className="text-xs text-gray-500">{tr.target_store_city}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{tr.product_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{tr.product_sku}</div>
                    </td>
                    <td className="py-3 font-semibold">{tr.quantity}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.cls}`}>
                        {t(s.labelKey)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(tr.created_at).toLocaleDateString(dateLocale[lang])}
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      {tr.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleAction(tr.id, 'approve')}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">{t('transfers.approve')}</button>
                          <button onClick={() => handleAction(tr.id, 'reject')}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">{t('transfers.reject')}</button>
                        </>
                      )}
                      {tr.status === 'APPROVED' && (
                        <button onClick={() => handleAction(tr.id, 'complete')}
                          className="text-green-600 hover:text-green-800 text-xs font-medium">{t('transfers.complete')}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && transfers.length > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{t('transfers.modalTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.sourceStore')}</label>
                <select className="input" value={form.source_store_id}
                  onChange={(e) => setForm({ ...form, source_store_id: e.target.value })} required>
                  <option value="">{t('common.select')}</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.targetStore')}</label>
                <select className="input" value={form.target_store_id}
                  onChange={(e) => setForm({ ...form, target_store_id: e.target.value })} required>
                  <option value="">{t('common.select')}</option>
                  {stores.filter((s) => s.id !== form.source_store_id).map((s) =>
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.product')}</label>
                <select className="input" value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">{t('common.select')}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.qty')}</label>
                <input className="input" type="number" min="1" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transfers.note')}</label>
                <textarea className="input" rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{t('transfers.create')}</button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
