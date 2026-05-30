'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { isAuthenticated, setToken } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ email: 'admin@smartshelf.com', password: 'admin123' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      toast.error(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <svg className="w-9 h-9 text-navy-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">SmartShelf</h1>
          <p className="text-navy-200 mt-1 text-sm">{t('app.tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('login.title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-5 text-center">
            {t('login.noAccount')}{' '}
            <Link href="/register" className="text-navy-700 font-medium hover:underline">{t('login.register')}</Link>
          </p>
          <p className="text-xs text-gray-400 mt-3 text-center">
            {t('login.demo')}
          </p>
        </div>
      </div>
    </div>
  );
}
