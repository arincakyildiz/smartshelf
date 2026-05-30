'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Store } from '@/types';
import { useT, apiErrorMessage } from '@/lib/i18n';

export default function StoresPage() {
  const t = useT();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState({ name: '', city: '', is_active: true });

  const [cities, setCities] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (filterCity)   params.set('city', filterCity);
      if (filterActive) params.set('is_active', filterActive);
      const { data } = await api.get(`/stores${params.toString() ? '?' + params : ''}`);
      // city filter active → response is array (no pagination needed for stores typically)
      setStores(Array.isArray(data) ? data : data.items);
    } catch {
      toast.error(t('stores.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStores(); }, [search, filterCity, filterActive]);
  useEffect(() => {
    api.get('/stores/cities').then(({ data }) => setCities(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', city: '', is_active: true });
    setShowModal(true);
  }

  function openEdit(s: Store) {
    setEditing(s);
    setForm({ name: s.name, city: s.city, is_active: s.is_active });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/stores/${editing.id}`, form);
        toast.success(t('stores.updated'));
      } else {
        await api.post('/stores', form);
        toast.success(t('stores.added'));
      }
      setShowModal(false);
      fetchStores();
    } catch (err: any) {
      toast.error(apiErrorMessage(t, err, 'stores.actionFailed'));
    }
  }

  async function toggleActive(store: Store) {
    try {
      await api.put(`/stores/${store.id}`, { is_active: !store.is_active });
      fetchStores();
    } catch {
      toast.error(t('stores.updateFailed'));
    }
  }

  async function handleDelete(store: Store) {
    if (!confirm(t('stores.confirmDelete', { name: store.name }))) return;
    try {
      await api.delete(`/stores/${store.id}`);
      toast.success(t('stores.deleted'));
      fetchStores();
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.details) {
        const { inventory_rows, transfers, requests, users } = data.details;
        const msg = t('stores.linkedRecords', {
          inventory: inventory_rows, transfers, requests, users,
        });
        if (confirm(msg)) {
          try {
            await api.delete(`/stores/${store.id}?force=true`);
            toast.success(t('stores.forceDeleted'));
            fetchStores();
          } catch {
            toast.error(t('stores.forceDeleteFailed'));
          }
        }
      } else {
        toast.error(apiErrorMessage(t, err, 'stores.deleteFailed'));
      }
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('stores.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('stores.count', { count: stores.length })}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">{t('stores.add')}</button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="input pl-9"
              placeholder={t('stores.searchPlaceholder')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">{t('stores.allCities')}</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">{t('stores.allStatuses')}</option>
            <option value="true">{t('stores.activeOnly')}</option>
            <option value="false">{t('stores.passiveOnly')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stores.map((store) => (
          <div key={store.id} className="card group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-navy-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate" title={store.name}>{store.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{store.city}</p>
                </div>
              </div>
              <button
                onClick={() => toggleActive(store)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                  store.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {store.is_active ? t('stores.active') : t('stores.passive')}
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => openEdit(store)}
                className="flex-1 text-navy-700 hover:bg-navy-50 text-xs font-medium py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t('common.edit')}
              </button>
              <button onClick={() => handleDelete(store)}
                className="flex-1 text-red-600 hover:bg-red-50 text-xs font-medium py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">
              {editing ? t('stores.editTitle') : t('stores.newTitle')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.fieldName')}</label>
                <input className="input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.city')}</label>
                <input className="input" value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-navy-800"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-gray-700">{t('stores.active')}</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? t('common.save') : t('common.add')}
                </button>
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
