'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DashboardStats, ExcessStore, InventoryItem } from '@/types';
import { StockDistributionChart, StoreComparisonChart } from '@/components/dashboard/Charts';
import { useT } from '@/lib/i18n';

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
  const t = useT();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [critical, setCritical] = useState<InventoryItem[]>([]);
  const [excessStores, setExcessStores] = useState<ExcessStore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, inventoryRes, excessRes] = await Promise.all([
        api.get('/inventory/stats'),
        api.get('/inventory'),
        api.get('/inventory/excess-stores'),
      ]);
      setStats(statsRes.data);
      setCritical(inventoryRes.data.filter((i: InventoryItem) => i.stock_level === 'critical'));
      setExcessStores(excessRes.data);
    } catch {
      toast.error(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label={t('dashboard.totalProducts')} value={stats?.total_products ?? 0} color="bg-navy-800"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />} />
        <StatCard label={t('dashboard.activeStores')} value={stats?.active_stores ?? 0} color="bg-navy-600"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />} />
        <StatCard label={t('dashboard.criticalStock')} value={stats?.critical_stock ?? 0} color="bg-red-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />} />
        <StatCard label={t('dashboard.lowStock')} value={stats?.low_stock ?? 0} color="bg-yellow-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />} />
        <StatCard label={t('dashboard.normalStock')} value={stats?.normal_stock ?? 0} color="bg-green-500"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />} />
      </div>

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StockDistributionChart stats={stats} />
          <StoreComparisonChart excessStores={excessStores} />
        </div>
      )}

      {/* Two-column: Critical + Excess Stores */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Critical Items */}
        <div className="card xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {t('dashboard.criticalItems')}
            {critical.length > 0 && (
              <span className="ml-2 badge-critical">{critical.length}</span>
            )}
          </h2>
          {critical.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard.noCritical')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3 font-medium">{t('common.product')}</th>
                    <th className="pb-3 font-medium">{t('common.sku')}</th>
                    <th className="pb-3 font-medium">{t('common.store')}</th>
                    <th className="pb-3 font-medium">{t('common.city')}</th>
                    <th className="pb-3 font-medium">{t('common.qty')}</th>
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
                        <span className="badge-critical">{t('dashboard.qtyUnit', { qty: item.quantity })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Excess Stock Stores */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {t('dashboard.excessStores')}
            <span className="ml-2 text-xs text-gray-500 font-normal">{t('dashboard.byTotalStock')}</span>
          </h2>
          {excessStores.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard.noData')}</p>
          ) : (
            <ul className="space-y-3">
              {excessStores.map((s, i) => (
                <li key={s.store_id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                    i === 0 ? 'bg-navy-800 text-white' :
                    i === 1 ? 'bg-navy-200 text-navy-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{s.store_name}</p>
                    <p className="text-xs text-gray-500">{s.store_city}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy-800">{s.total_quantity}</p>
                    {s.excess_product_count > 0 && (
                      <p className="text-xs text-green-600">{t('dashboard.productsOver50', { count: s.excess_product_count })}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
