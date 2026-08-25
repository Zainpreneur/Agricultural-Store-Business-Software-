import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Purchase } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Purchase[]>('/purchases')
      .then((res) => setPurchases(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Purchases</h1>
        <Link to="/purchases/new" className="btn-primary">
          + New Purchase
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-stone-400 py-6">
                  Loading…
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-stone-400 py-6">
                  No purchases recorded yet.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.invoiceNo}</td>
                  <td>{p.supplier?.name}</td>
                  <td>{formatDate(p.date)}</td>
                  <td>{p.items.length}</td>
                  <td>${formatMoney(p.totalAmount)}</td>
                  <td>${formatMoney(p.paidAmount)}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === 'PAID'
                          ? 'bg-agri-100 text-agri-700'
                          : p.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
