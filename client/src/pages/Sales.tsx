import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Sale } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Sale[]>('/sales')
      .then((res) => setSales(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Sales</h1>
        <Link to="/sales/new" className="btn-primary">
          + New Sale
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Mode</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-stone-400 py-6">
                  Loading…
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-stone-400 py-6">
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.invoiceNo}</td>
                  <td>{s.customer?.name || 'Walk-in'}</td>
                  <td>{formatDateTime(s.date)}</td>
                  <td>${formatMoney(s.totalAmount)}</td>
                  <td>${formatMoney(s.paidAmount)}</td>
                  <td>{s.paymentMode.replace('_', ' ')}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === 'COMPLETED'
                          ? 'bg-agri-100 text-agri-700'
                          : s.status === 'CANCELLED'
                          ? 'bg-stone-200 text-stone-600'
                          : s.status === 'PARTIALLY_PAID'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link to={`/sales/${s.id}`} className="text-agri-600 hover:underline text-xs">
                      View →
                    </Link>
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
