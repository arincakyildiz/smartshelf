'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Store } from '@/types';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', is_active: true });

  async function fetchStores() {
    try {
      const { data } = await api.get('/stores');
      setStores(data);
    } catch {
      toast.error('Mağazalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStores(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/stores', form);
      toast.success('Mağaza eklendi');
      setShowModal(false);
      fetchStores();
    } catch {
      toast.error('İşlem başarısız');
    }
  }

  async function toggleActive(store: Store) {
    try {
      await api.put(`/stores/${store.id}`, { is_active: !store.is_active });
      fetchStores();
    } catch {
      toast.error('Güncelleme başarısız');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mağazalar</h1>
          <p className="text-gray-500 text-sm mt-1">{stores.length} mağaza</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Mağaza Ekle</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stores.map((store) => (
          <div key={store.id} className="card flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{store.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{store.city}</p>
              </div>
            </div>
            <button
              onClick={() => toggleActive(store)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                store.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {store.is_active ? 'Aktif' : 'Pasif'}
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">Yeni Mağaza</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza Adı</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Ekle</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
