'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Transfer, TransferStatus, Store, Product } from '@/types';
import Pagination from '@/components/ui/Pagination';

const STATUS_MAP: Record<TransferStatus, { label: string; cls: string }> = {
  PENDING:   { label: 'Beklemede',    cls: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { label: 'Onaylandı',    cls: 'bg-blue-100 text-blue-700'     },
  REJECTED:  { label: 'Reddedildi',   cls: 'bg-red-100 text-red-700'       },
  COMPLETED: { label: 'Tamamlandı',   cls: 'bg-green-100 text-green-700'   },
};

const LIMIT = 10;

export default function TransfersPage() {
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
      toast.error('Transferler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterStore]);

  // Initial load: stores + products for dropdowns
  useEffect(() => {
    Promise.all([api.get('/stores'), api.get('/products')])
      .then(([s, p]) => {
        setStores(Array.isArray(s.data) ? s.data : s.data.items);
        setProducts(Array.isArray(p.data) ? p.data : p.data.items);
      })
      .catch(() => toast.error('Veriler yüklenemedi'));
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);
  useEffect(() => { setPage(1); }, [filterStatus, filterStore]);

  const fetchAll = fetchTransfers;

  async function handleAction(id: string, action: 'approve' | 'reject' | 'complete') {
    const label = action === 'approve' ? 'onaylanıyor' : action === 'reject' ? 'reddediliyor' : 'tamamlanıyor';
    try {
      await api.patch(`/transfers/${id}`, { action });
      toast.success(`Transfer ${label === 'onaylanıyor' ? 'onaylandı' : label === 'reddediliyor' ? 'reddedildi' : 'tamamlandı'}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'İşlem başarısız');
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
      toast.success('Transfer talebi oluşturuldu');
      setShowModal(false);
      setForm({ source_store_id: '', target_store_id: '', product_id: '', quantity: '', notes: '' });
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Oluşturulamadı');
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mağaza Transferleri</h1>
          <p className="text-gray-500 text-sm mt-1">{total} transfer</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Yeni Transfer
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            <option value="PENDING">Beklemede</option>
            <option value="APPROVED">Onaylandı</option>
            <option value="REJECTED">Reddedildi</option>
            <option value="COMPLETED">Tamamlandı</option>
          </select>
          <select className="input" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}>
            <option value="">Tüm Mağazalar</option>
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
          <p className="text-center text-gray-500 py-8">Henüz transfer kaydı yok.</p>
        ) : (
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">Kaynak</th>
                <th className="pb-3 font-medium">Hedef</th>
                <th className="pb-3 font-medium">Ürün</th>
                <th className="pb-3 font-medium">Miktar</th>
                <th className="pb-3 font-medium">Durum</th>
                <th className="pb-3 font-medium">Tarih</th>
                <th className="pb-3 font-medium text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((t) => {
                const s = STATUS_MAP[t.status];
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{t.source_store_name}</div>
                      <div className="text-xs text-gray-500">{t.source_store_city}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{t.target_store_name}</div>
                      <div className="text-xs text-gray-500">{t.target_store_city}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-800">{t.product_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{t.product_sku}</div>
                    </td>
                    <td className="py-3 font-semibold">{t.quantity}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      {t.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleAction(t.id, 'approve')}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">Onayla</button>
                          <button onClick={() => handleAction(t.id, 'reject')}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">Reddet</button>
                        </>
                      )}
                      {t.status === 'APPROVED' && (
                        <button onClick={() => handleAction(t.id, 'complete')}
                          className="text-green-600 hover:text-green-800 text-xs font-medium">Tamamla</button>
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
            <h2 className="text-lg font-semibold mb-5">Yeni Transfer Talebi</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak Mağaza</label>
                <select className="input" value={form.source_store_id}
                  onChange={(e) => setForm({ ...form, source_store_id: e.target.value })} required>
                  <option value="">Seçiniz...</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Mağaza</label>
                <select className="input" value={form.target_store_id}
                  onChange={(e) => setForm({ ...form, target_store_id: e.target.value })} required>
                  <option value="">Seçiniz...</option>
                  {stores.filter((s) => s.id !== form.source_store_id).map((s) =>
                    <option key={s.id} value={s.id}>{s.name}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün</label>
                <select className="input" value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">Seçiniz...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input className="input" type="number" min="1" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not (opsiyonel)</label>
                <textarea className="input" rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Oluştur</button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
