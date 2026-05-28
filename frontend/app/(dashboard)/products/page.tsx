'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Product } from '@/types';
import Pagination from '@/components/ui/Pagination';

interface Row extends Product {}

const LIMIT = 10;

export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category: '', price: '' });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page:     String(page),
        limit:    String(LIMIT),
        sort_by:  sortBy,
        sort_dir: sortDir,
      });
      if (search)   params.set('search', search);
      if (category) params.set('category', category);

      const { data } = await api.get(`/products?${params}`);
      setRows(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, search, category, sortBy, sortDir]);

  // Initial: load categories
  useEffect(() => {
    api.get('/products/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  // Reload when filters change
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page when search/filter changes
  useEffect(() => { setPage(1); }, [search, category, sortBy, sortDir]);

  // Search debouncing
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', sku: '', category: '', price: '' });
    setShowModal(true);
  }

  function openEdit(p: Row) {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, price: String(p.price) });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price) };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Ürün güncellendi');
      } else {
        await api.post('/products', payload);
        toast.success('Ürün eklendi');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'İşlem başarısız');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ürünü silmek istiyor musunuz?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Ürün silindi');
      fetchProducts();
    } catch {
      toast.error('Silme başarısız');
    }
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-gray-500 text-sm mt-1">{total} ürün</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Ürün Ekle</button>
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
              placeholder="Ürün adı veya SKU ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tüm Kategoriler</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [b, d] = e.target.value.split(':');
              setSortBy(b);
              setSortDir(d as 'asc' | 'desc');
            }}>
            <option value="created_at:desc">En yeni</option>
            <option value="created_at:asc">En eski</option>
            <option value="name:asc">İsim A-Z</option>
            <option value="name:desc">İsim Z-A</option>
            <option value="price:asc">Fiyat ↑</option>
            <option value="price:desc">Fiyat ↓</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {search || category ? 'Filtreye uyan ürün yok' : 'Henüz ürün yok'}
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium cursor-pointer hover:text-navy-700" onClick={() => toggleSort('name')}>
                    Ürün Adı {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="pb-3 font-medium">SKU</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium cursor-pointer hover:text-navy-700" onClick={() => toggleSort('price')}>
                    Fiyat {sortBy === 'price' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="py-3 text-gray-500 font-mono">{p.sku}</td>
                    <td className="py-3">
                      <span className="bg-navy-100 text-navy-800 text-xs px-2 py-1 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 text-gray-700">₺{Number(p.price).toFixed(2)}</td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-navy-600 hover:text-navy-800 text-xs font-medium">Düzenle</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-5">{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input className="input font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{editing ? 'Kaydet' : 'Ekle'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
