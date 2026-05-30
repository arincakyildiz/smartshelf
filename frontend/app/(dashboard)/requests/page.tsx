'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { StockRequest, MatchResult, Store, Product } from '@/types';
import { useI18n } from '@/lib/i18n';
import { dateLocale } from '@/lib/dictionaries';

export default function RequestsPage() {
  const { t, lang } = useI18n();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ requesting_store_id: '', product_id: '', quantity_needed: '' });
  const [matchResult, setMatchResult] = useState<{ request: StockRequest; matches: MatchResult[] } | null>(null);

  async function fetchAll() {
    try {
      const [reqRes, storeRes, prodRes] = await Promise.all([
        api.get('/requests'),
        api.get('/stores'),
        api.get('/products'),
      ]);
      setRequests(reqRes.data);
      setStores(Array.isArray(storeRes.data) ? storeRes.data : storeRes.data.items);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.items);
    } catch {
      toast.error(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post('/match-request', {
        requesting_store_id: form.requesting_store_id,
        product_id: form.product_id,
        quantity_needed: Number(form.quantity_needed),
      });
      toast.success(t('requests.created'));
      setShowModal(false);
      setForm({ requesting_store_id: '', product_id: '', quantity_needed: '' });
      setMatchResult(data);
      fetchAll();
    } catch {
      toast.error(t('requests.createFailed'));
    }
  }

  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending: { label: t('requests.statusPending'), cls: 'bg-yellow-100 text-yellow-700' },
    fulfilled: { label: t('requests.statusFulfilled'), cls: 'bg-green-100 text-green-700' },
    cancelled: { label: t('requests.statusCancelled'), cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('requests.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('requests.subtitle')}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">{t('requests.create')}</button>
      </div>

      {/* Match Result */}
      {matchResult && matchResult.matches.length > 0 && (
        <div className="card mb-6 border-l-4 border-navy-700">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-semibold text-gray-800">
              {t('requests.lastMatch', { product: matchResult.request.product_name ?? '' })}
            </h2>
            <button onClick={() => setMatchResult(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchResult.matches.map((m, i) => (
              <div key={m.source_store_id} className={`rounded-xl p-4 border ${i === 0 ? 'border-navy-300 bg-navy-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-sm text-gray-800">{m.source_store_name}</p>
                  <span className="bg-navy-800 text-white text-xs px-2 py-0.5 rounded-full font-bold">{m.score}p</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{m.source_store_city}</p>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('requests.available', { qty: m.available_quantity })}</p>
                <div className="flex flex-wrap gap-1">
                  {m.reasons.map((r) => (
                    <span key={r} className="bg-navy-100 text-navy-700 text-xs px-2 py-0.5 rounded-full">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">{t('requests.colNumber')}</th>
                <th className="pb-3 font-medium">{t('common.store')}</th>
                <th className="pb-3 font-medium">{t('common.product')}</th>
                <th className="pb-3 font-medium">{t('common.qty')}</th>
                <th className="pb-3 font-medium">{t('common.status')}</th>
                <th className="pb-3 font-medium">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-gray-500">#{r.id}</td>
                    <td className="py-3 font-medium">{r.store_name ?? <span className="text-gray-400 italic">{t('common.deleted')}</span>}</td>
                    <td className="py-3">{r.product_name ?? <span className="text-gray-400 italic">{t('common.deleted')}</span>}</td>
                    <td className="py-3 font-semibold">{t('requests.qtyUnit', { qty: r.quantity_needed })}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(r.created_at).toLocaleDateString(dateLocale[lang])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{t('requests.modalTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.requestingStore')}</label>
                <select className="input" value={form.requesting_store_id} onChange={(e) => setForm({ ...form, requesting_store_id: e.target.value })} required>
                  <option value="">{t('common.select')}</option>
                  {stores.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.product')}</label>
                <select className="input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">{t('common.select')}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('requests.neededQty')}</label>
                <input className="input" type="number" min="1" value={form.quantity_needed} onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{t('requests.match')}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
