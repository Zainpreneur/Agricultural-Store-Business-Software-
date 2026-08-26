import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Payment } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Payment[]>('/payments')
      .then((res) => setPayments(res.data))
      .finally(() => setLoading(false));
  }, []);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Customer Payments</h1>
        <div className="text-sm text-stone-500">
          Total collected: <span className="font-semibold text-stone-800">${formatMoney(total)}</span>
        </div>
      </div>
      <p className="text-sm text-stone-500">
        To record a new payment, open a customer's ledger and click "Record Payment".
      </p>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-stone-400 py-6">
                  Loading…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-stone-400 py-6">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.date)}</td>
                  <td>
                    <Link to={`/customers/${p.customerId}`} className="text-agri-600 hover:underline">
                      {p.customer?.name}
                    </Link>
                  </td>
                  <td>${formatMoney(p.amount)}</td>
                  <td>{p.mode.replace('_', ' ')}</td>
                  <td className="text-stone-500">{p.note || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
