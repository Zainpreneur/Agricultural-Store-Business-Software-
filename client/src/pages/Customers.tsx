import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Customer } from '../types';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';

const emptyForm = { name: '', phone: '', address: '', creditLimit: '0' };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    api
      .get<Customer[]>(`/customers?${query.toString()}`)
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', { ...form, creditLimit: Number(form.creditLimit) });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">Customers</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New Customer
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn-secondary" onClick={load}>
          Search
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Credit Balance</th>
              <th>Credit Limit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-stone-400 py-6">
                  Loading…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-stone-400 py-6">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.address || '—'}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.creditBalance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      ${formatMoney(c.creditBalance)}
                    </span>
                  </td>
                  <td>{c.creditLimit > 0 ? `$${formatMoney(c.creditLimit)}` : 'No limit'}</td>
                  <td className="text-right">
                    <Link to={`/customers/${c.id}`} className="text-agri-600 hover:underline text-xs">
                      Ledger →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Customer" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Credit Limit (0 = no limit)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
