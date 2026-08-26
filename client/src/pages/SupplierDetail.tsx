import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Supplier, Purchase } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export default function SupplierDetail() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState<(Supplier & { purchases: Purchase[] }) | null>(null);

  useEffect(() => {
    if (id) api.get(`/suppliers/${id}`).then((res) => setSupplier(res.data));
  }, [id]);

  if (!supplier) return <div className="text-stone-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/suppliers" className="text-agri-600 text-sm">
          ← Back to suppliers
        </Link>
        <h1 className="text-2xl font-bold text-stone-800 mt-1">{supplier.name}</h1>
        <p className="text-stone-500 text-sm">
          {supplier.phone || '—'} · {supplier.address || '—'}
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {supplier.purchases.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-stone-400 py-6">
                  No purchases recorded yet.
                </td>
              </tr>
            ) : (
              supplier.purchases.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.invoiceNo}</td>
                  <td>{formatDate(p.date)}</td>
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
