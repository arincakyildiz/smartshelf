'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { ProductWithStock } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductWithStock | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category: '', price: '' });

  async function fetchProducts() {
    try {
      const { data } = await api.get('/inventory/products-with-stock');
      setProducts(data);
    } catch {
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', sku: '', category: '', price: '' });
    setShowModal(true);
  }

  function openEdit(p: ProductWithStock) {
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
    } catch {
      toast.error('İşlem başarısız');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bu ürünü silmek istiyor musunuz?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Ürün silindi');
      fetchProducts();
    } catch {
      toast.error('Silme başarısız');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} ürün listeleniyor</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Ürün Ekle</button>
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
                <th className="pb-3 font-medium">Ürün Adı</th>
                <th className="pb-3 font-medium">SKU</th>
                <th className="pb-3 font-medium">Kategori</th>
                <th className="pb-3 font-medium">Fiyat</th>
                <th className="pb-3 font-medium">Toplam Stok</th>
                <th className="pb-3 font-medium">Mağaza Sayısı</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const stockCls =
                  p.total_stock < 10 ? 'text-red-600' :
                  p.total_stock < 25 ? 'text-yellow-600' :
                  'text-green-700';
                return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="py-3 text-gray-500 font-mono">{p.sku}</td>
                  <td className="py-3">
                    <span className="bg-navy-100 text-navy-800 text-xs px-2 py-1 rounded-full">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700">₺{Number(p.price).toFixed(2)}</td>
                  <td className={`py-3 font-semibold ${stockCls}`}>{p.total_stock} adet</td>
                  <td className="py-3 text-gray-500">{p.store_count}</td>
                  <td className="py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-navy-600 hover:text-navy-800 text-xs font-medium">Düzenle</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Sil</button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
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
