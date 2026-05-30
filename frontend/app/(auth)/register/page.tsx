'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { isAuthenticated, setToken } from '@/lib/auth';

type SignupStore = { id: string; name: string; city: string };

export default function RegisterPage() {
  const router = useRouter();
  const [stores, setStores] = useState<SignupStore[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', store_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    api.get('/auth/stores')
      .then(({ data }) => setStores(data))
      .catch(() => toast.error('Mağaza listesi yüklenemedi'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Hesabınız oluşturuldu');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-navy-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">SmartShelf</h1>
          <p className="text-navy-200 mt-1 text-sm">Stok Yönetim Sistemi</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Hesap Oluştur</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                minLength={2}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-1">En az 6 karakter</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza</label>
              <select
                className="input"
                value={form.store_id}
                onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                required
              >
                <option value="">Seçiniz...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Mağaza yöneticisi olarak kaydolursunuz</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-5 text-center">
            Zaten hesabın var mı?{' '}
            <Link href="/login" className="text-navy-700 font-medium hover:underline">Giriş yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
