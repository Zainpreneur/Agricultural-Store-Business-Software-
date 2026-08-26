import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';

interface SalesReport {
  totalRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  saleCount: number;
  byDay: { date: string; totalAmount: number; paidAmount: number; count: number }[];
}
interface PurchasesReport {
  totalPurchased: number;
  totalPaid: number;
  totalOwedToSuppliers: number;
  purchaseCount: number;
}
interface TopProduct {
  productId: string;
  name: string;
  qtySold: number;
  revenue: number;
}
interface InventoryReport {
  totalStockValue: number;
  potentialRevenue: number;
  products: {
    id: string;
    name: string;
    sku: string;
    category: string | null;
    stockQty: number;
    reorderLevel: number;
    lowStock: boolean;
    stockValue: number;
  }[];
}
interface ReceivablesReport {
  totalReceivable: number;
  customers: { id: string; name: string; creditBalance: number }[];
}

function toIso(dateStr: string, endOfDay = false) {
  return new Date(`${dateStr}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [purchases, setPurchases] = useState<PurchasesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesReport | null>(null);

  function load() {
    const range = `from=${toIso(from)}&to=${toIso(to, true)}`;
    api.get(`/reports/sales?${range}`).then((res) => setSales(res.data));
    api.get(`/reports/purchases?${range}`).then((res) => setPurchases(res.data));
    api.get(`/reports/top-products?${range}`).then((res) => setTopProducts(res.data));
    api.get('/reports/inventory').then((res) => setInventory(res.data));
    api.get('/reports/receivables').then((res) => setReceivables(res.data));
  }

  useEffect(load, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Reports</h1>

      <div className="card p-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={load}>
          Apply
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">💰 Sales Summary</h2>
          {sales ? (
            <ul className="text-sm space-y-1.5">
              <li className="flex justify-between">
                <span className="text-stone-500">Total Revenue</span>
                <span className="font-medium">${formatMoney(sales.totalRevenue)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">Cash Collected</span>
                <span className="font-medium">${formatMoney(sales.totalCollected)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">Still Outstanding</span>
                <span className="font-medium text-amber-600">${formatMoney(sales.totalOutstanding)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">No. of Sales</span>
                <span className="font-medium">{sales.saleCount}</span>
              </li>
            </ul>
          ) : (
            <p className="text-stone-400 text-sm">Loading…</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">📦 Purchases Summary</h2>
          {purchases ? (
            <ul className="text-sm space-y-1.5">
              <li className="flex justify-between">
                <span className="text-stone-500">Total Purchased</span>
                <span className="font-medium">${formatMoney(purchases.totalPurchased)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">Paid to Suppliers</span>
                <span className="font-medium">${formatMoney(purchases.totalPaid)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">Owed to Suppliers</span>
                <span className="font-medium text-amber-600">${formatMoney(purchases.totalOwedToSuppliers)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500">No. of Purchases</span>
                <span className="font-medium">{purchases.purchaseCount}</span>
              </li>
            </ul>
          ) : (
            <p className="text-stone-400 text-sm">Loading…</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">🏆 Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-stone-400 text-sm">No sales in this range.</p>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 8).map((p) => (
                  <tr key={p.productId}>
                    <td>{p.name}</td>
                    <td>{p.qtySold}</td>
                    <td>${formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-stone-800 mb-3">🧾 Accounts Receivable</h2>
          {receivables ? (
            <>
              <p className="text-sm text-stone-500 mb-2">
                Total outstanding:{' '}
                <span className="font-semibold text-amber-600">${formatMoney(receivables.totalReceivable)}</span>
              </p>
              {receivables.customers.length === 0 ? (
                <p className="text-stone-400 text-sm">No outstanding balances.</p>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.customers.slice(0, 8).map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>${formatMoney(c.creditBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-stone-400 text-sm">Loading…</p>
          )}
        </div>

        <div className="card p-4 md:col-span-2">
          <h2 className="font-semibold text-stone-800 mb-3">📊 Inventory Valuation</h2>
          {inventory ? (
            <>
              <div className="flex gap-8 text-sm mb-3">
                <div>
                  <span className="text-stone-500">Total Stock Value (cost): </span>
                  <span className="font-semibold">${formatMoney(inventory.totalStockValue)}</span>
                </div>
                <div>
                  <span className="text-stone-500">Potential Revenue (selling price): </span>
                  <span className="font-semibold">${formatMoney(inventory.potentialRevenue)}</span>
                </div>
              </div>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock Qty</th>
                    <th>Stock Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category || '—'}</td>
                      <td>{p.stockQty}</td>
                      <td>${formatMoney(p.stockValue)}</td>
                      <td>
                        {p.lowStock ? (
                          <span className="badge bg-red-100 text-red-700">Low Stock</span>
                        ) : (
                          <span className="badge bg-agri-100 text-agri-700">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-stone-400 text-sm">Loading…</p>
          )}
        </div>
      </div>
    </div>
  );
}
