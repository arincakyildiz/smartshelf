'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DashboardStats, InventoryItem } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

function StatCard({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [critical, setCritical] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, inventoryRes] = await Promise.all([
        api.get('/inventory/stats'),
        api.get('/inventory'),
      ]);
      setStats(statsRes.data);
      setCritical(inventoryRes.data.filter((i: InventoryItem) => i.stock_level === 'critical'));
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = io(WS_URL, { auth: { token: localStorage.getItem('token') } });
    socket.on('inventory:update', () => fetchData());
    return () => { socket.disconnect(); };
  }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-navy-800 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Stok durumuna genel bakış</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Toplam Ürün" value={stats?.total_products ?? 0} color="bg-navy-800"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />} />
        <StatCard label="Aktif Mağaza" value={stats?.active_stores ?? 0} color="bg-navy-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />} />
        <StatCard label="Kritik Stok" value={stats?.critical_stock ?? 0} color="bg-red-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />} />
        <StatCard label="Düşük Stok" value={stats?.low_stock ?? 0} color="bg-yellow-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />} />
        <StatCard label="Normal Stok" value={stats?.normal_stock ?? 0} color="bg-green-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
      </div>

      {/* Critical Items */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Kritik Stok Ürünleri
          {critical.length > 0 && (
            <span className="ml-2 badge-critical">{critical.length}</span>
          )}
        </h2>
        {critical.length === 0 ? (
          <p className="text-sm text-gray-500">Kritik stok yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Ürün</th>
                  <th className="pb-3 font-medium">SKU</th>
                  <th className="pb-3 font-medium">Mağaza</th>
                  <th className="pb-3 font-medium">Şehir</th>
                  <th className="pb-3 font-medium">Miktar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {critical.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{item.product_name}</td>
                    <td className="py-3 text-gray-500">{item.product_sku}</td>
                    <td className="py-3">{item.store_name}</td>
                    <td className="py-3 text-gray-500">{item.store_city}</td>
                    <td className="py-3">
                      <span className="badge-critical">{item.quantity} adet</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
