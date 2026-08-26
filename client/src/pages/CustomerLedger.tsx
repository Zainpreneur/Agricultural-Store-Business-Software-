import { useEffect, useState, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Customer, PaymentMode } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import Modal from '../components/Modal';

interface LedgerEntry {
  type: 'SALE' | 'PAYMENT';
  id: string;
  date: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomerLedger() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .get(`/customers/${id}/ledger`)
      .then((res) => {
        setCustomer(res.data.customer);
        setEntries(res.data.entries);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payments', { customerId: id, amount: Number(amount), mode, note });
      setShowPay(false);
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (loading || !customer) return <div className="text-stone-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/customers" className="text-agri-600 text-sm">
            ← Back to customers
          </Link>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">{customer.name}</h1>
          <p className="text-stone-500 text-sm">
            {customer.phone || '—'} · {customer.address || '—'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-stone-400 font-medium">Outstanding Balance</div>
          <div className={`text-2xl font-bold ${customer.creditBalance > 0 ? 'text-amber-600' : 'text-agri-700'}`}>
            ${formatMoney(customer.creditBalance)}
          </div>
          {customer.creditBalance > 0 && (
            <button className="btn-primary mt-2" onClick={() => setShowPay(true)}>
              Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Debit (Owed)</th>
              <th>Credit (Paid)</th>
              <th>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-stone-400 py-6">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={`${e.type}-${e.id}`}>
                  <td>{formatDateTime(e.date)}</td>
                  <td>
                    <span
                      className={`badge ${
                        e.type === 'SALE' ? 'bg-stone-100 text-stone-600' : 'bg-agri-100 text-agri-700'
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td>{e.reference}</td>
                  <td>{e.debit ? `$${formatMoney(e.debit)}` : '—'}</td>
                  <td>{e.credit ? `$${formatMoney(e.credit)}` : '—'}</td>
                  <td className="font-medium">${formatMoney(e.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPay && (
        <Modal title="Record Payment" onClose={() => setShowPay(false)}>
          <form onSubmit={handlePay} className="space-y-4">
            <p className="text-sm text-stone-500">
              Outstanding balance: ${formatMoney(customer.creditBalance)}
            </p>
            <div>
              <label className="label">Amount</label>
              <input
                type="number"
                min="0.01"
                max={customer.creditBalance}
                step="0.01"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowPay(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
