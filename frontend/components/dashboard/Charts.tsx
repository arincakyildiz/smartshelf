'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DashboardStats, ExcessStore } from '@/types';

const COLORS = {
  critical: '#ef4444',
  low:      '#eab308',
  normal:   '#22c55e',
  excess:   '#3b82f6',
  navy:     '#152460',
};

// ─── Stok Dağılımı (Pie) ──────────────────────────────────────────────────────
export function StockDistributionChart({ stats }: { stats: DashboardStats }) {
  const data = [
    { name: 'Kritik (<10)',   value: stats.critical_stock, color: COLORS.critical },
    { name: 'Düşük (10-24)',  value: stats.low_stock,      color: COLORS.low      },
    { name: 'Normal (25+)',   value: stats.normal_stock,   color: COLORS.normal   },
  ];

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Stok Seviyesi Dağılımı</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Mağaza Karşılaştırma (Bar) ───────────────────────────────────────────────
export function StoreComparisonChart({ excessStores }: { excessStores: ExcessStore[] }) {
  const data = excessStores.map((s) => ({
    name:  s.store_name.replace('Mağaza ', '').slice(0, 18),
    stok:  s.total_quantity,
    fazla: s.excess_product_count,
  }));

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Mağaza Stok Karşılaştırma</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="stok"  fill={COLORS.navy}   name="Toplam Stok"     radius={[4, 4, 0, 0]} />
          <Bar dataKey="fazla" fill={COLORS.excess} name="Fazla Ürün (50+)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
