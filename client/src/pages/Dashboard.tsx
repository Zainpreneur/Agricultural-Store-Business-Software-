import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardSummary } from '../types';
import StatCard from '../components/StatCard';
import { formatMoney } from '../utils/format';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-stone-500">Loading dashboard…</div>;
  if (!summary) return <div className="text-stone-500">Could not load dashboard.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <Link to="/sales/new" className="btn-primary">
          + New Sale
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={`$${formatMoney(summary.todaySalesTotal)}`}
          sub={`${summary.todaySalesCount} transaction(s)`}
          icon="🧾"
          tone="good"
        />
        <StatCard
          label="Today's Cash Collected"
          value={`$${formatMoney(summary.todaySalesCollected)}`}
          icon="💵"
        />
        <StatCard
          label="This Month's Sales"
          value={`$${formatMoney(summary.monthSalesTotal)}`}
          sub={`${summary.monthSalesCount} transaction(s)`}
          icon="📈"
        />
        <StatCard
          label="Outstanding Credit"
          value={`$${formatMoney(summary.totalOutstandingCredit)}`}
          sub="Owed by customers"
          icon="📒"
          tone={summary.totalOutstandingCredit > 0 ? 'warn' : 'default'}
        />
        <StatCard label="Active Products" value={String(summary.activeProductCount)} icon="🌱" />
        <StatCard label="Customers" value={String(summary.customerCount)} icon="👨‍🌾" />
        <StatCard
          label="Inventory Value"
          value={`$${formatMoney(summary.inventoryValue)}`}
          sub="At cost price"
          icon="📦"
        />
        <StatCard
          label="Low Stock Items"
          value={String(summary.lowStockCount)}
          icon="⚠️"
          tone={summary.lowStockCount > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">⚠️ Low Stock Alerts</h2>
          {summary.lowStockProducts.length === 0 ? (
            <p className="text-sm text-stone-400">All products are sufficiently stocked.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {summary.lowStockProducts.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="badge bg-red-100 text-red-700">
                    {p.stockQty} {p.unit} left
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/products?lowStock=true" className="text-agri-600 text-sm font-medium mt-3 inline-block">
            View all →
          </Link>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">⏳ Expiring Soon (30 days)</h2>
          {summary.expiringSoonProducts.length === 0 ? (
            <p className="text-sm text-stone-400">No products expiring soon.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {summary.expiringSoonProducts.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="badge bg-amber-100 text-amber-700">
                    {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
