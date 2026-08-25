import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Sale } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [sale, setSale] = useState<Sale | null>(null);

  function load() {
    if (id) api.get<Sale>(`/sales/${id}`).then((res) => setSale(res.data));
  }
  useEffect(load, [id]);

  async function handleCancel() {
    if (!sale || !confirm('Cancel this sale? Stock will be restored and the customer balance adjusted.')) return;
    try {
      await api.post(`/sales/${sale.id}/cancel`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  if (!sale) return <div className="text-stone-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/sales" className="text-agri-600 text-sm">
          ← Back to sales
        </Link>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-stone-800">{sale.invoiceNo}</h1>
          <span
            className={`badge ${
              sale.status === 'COMPLETED'
                ? 'bg-agri-100 text-agri-700'
                : sale.status === 'CANCELLED'
                ? 'bg-stone-200 text-stone-600'
                : sale.status === 'PARTIALLY_PAID'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {sale.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-stone-500 text-sm">{formatDateTime(sale.date)}</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-stone-400">Customer</div>
            <div className="font-medium">{sale.customer?.name || 'Walk-in'}</div>
          </div>
          <div>
            <div className="text-stone-400">Payment Mode</div>
            <div className="font-medium">{sale.paymentMode.replace('_', ' ')}</div>
          </div>
        </div>

        <table className="table-base">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product?.name}</td>
                <td>{item.qty}</td>
                <td>${formatMoney(item.price)}</td>
                <td>${formatMoney(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span>${formatMoney(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Discount</span>
              <span>-${formatMoney(sale.discount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-1">
              <span>Total</span>
              <span>${formatMoney(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Paid</span>
              <span>${formatMoney(sale.paidAmount)}</span>
            </div>
            {sale.totalAmount - sale.paidAmount > 0 && (
              <div className="flex justify-between text-amber-600 font-medium">
                <span>Balance Due</span>
                <span>${formatMoney(sale.totalAmount - sale.paidAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {sale.status !== 'CANCELLED' && hasRole('ADMIN', 'MANAGER') && (
          <div className="flex justify-end border-t pt-4">
            <button className="btn-danger" onClick={handleCancel}>
              Cancel Sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
