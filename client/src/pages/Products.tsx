import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Product, Category } from '../types';
import Modal from '../components/Modal';
import { formatMoney } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  name: '',
  sku: '',
  categoryId: '',
  unit: 'piece',
  costPrice: '0',
  sellingPrice: '0',
  stockQty: '0',
  reorderLevel: '10',
  batchNo: '',
  expiryDate: '',
};

export default function Products() {
  const { hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const lowStockOnly = params.get('lowStock') === 'true';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');

  function load() {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (lowStockOnly) query.set('lowStock', 'true');
    api
      .get<Product[]>(`/products?${query.toString()}`)
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    api.get<Category[]>('/categories').then((res) => setCategories(res.data));
  }, []);

  useEffect(load, [lowStockOnly]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId || '',
      unit: p.unit,
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      stockQty: String(p.stockQty),
      reorderLevel: String(p.reorderLevel),
      batchNo: p.batchNo || '',
      expiryDate: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      sku: form.sku,
      categoryId: form.categoryId || null,
      unit: form.unit,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      stockQty: Number(form.stockQty),
      reorderLevel: Number(form.reorderLevel),
      batchNo: form.batchNo || null,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
    };
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleDeactivate(p: Product) {
    if (!confirm(`Deactivate "${p.name}"? It will be hidden from new sales but history is kept.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function handleAdjustSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adjustFor) return;
    try {
      await api.post(`/products/${adjustFor.id}/adjust`, {
        qtyChange: Number(adjustQty),
        reason: adjustReason,
      });
      setAdjustFor(null);
      setAdjustQty('0');
      setAdjustReason('');
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  const canEdit = hasRole('ADMIN', 'MANAGER');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">Products</h1>
        {canEdit && (
          <button className="btn-primary" onClick={openNew}>
            + New Product
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="input max-w-xs"
          placeholder="Search by name or SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button className="btn-secondary" onClick={load}>
          Search
        </button>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.checked) next.set('lowStock', 'true');
              else next.delete('lowStock');
              setParams(next);
            }}
          />
          Low stock only
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Stock</th>
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
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-stone-400 py-6">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-stone-500">{p.sku}</td>
                  <td>{p.category?.name || '—'}</td>
                  <td>{p.unit}</td>
                  <td>${formatMoney(p.costPrice)}</td>
                  <td>${formatMoney(p.sellingPrice)}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.stockQty <= p.reorderLevel ? 'bg-red-100 text-red-700' : 'bg-agri-100 text-agri-700'
                      }`}
                    >
                      {p.stockQty} {p.unit}
                    </span>
                  </td>
                  <td className="text-right space-x-2 whitespace-nowrap">
                    {canEdit && (
                      <>
                        <button className="text-agri-600 hover:underline text-xs" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button
                          className="text-stone-600 hover:underline text-xs"
                          onClick={() => setAdjustFor(p)}
                        >
                          Adjust
                        </button>
                        <button
                          className="text-red-600 hover:underline text-xs"
                          onClick={() => handleDeactivate(p)}
                        >
                          Deactivate
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'New Product'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                className="input"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Unit (kg, bag, litre…)</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Batch No. (optional)</label>
              <input
                className="input"
                value={form.batchNo}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cost Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Selling Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Stock Qty {editing && '(edit here or use Adjust)'}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Reorder Level</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Expiry Date (optional)</label>
              <input
                type="date"
                className="input"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
            {error && <div className="col-span-2 text-sm text-red-600">{error}</div>}
            <div className="col-span-2 flex justify-end gap-2">
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

      {adjustFor && (
        <Modal title={`Adjust Stock: ${adjustFor.name}`} onClose={() => setAdjustFor(null)}>
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <p className="text-sm text-stone-500">Current stock: {adjustFor.stockQty} {adjustFor.unit}</p>
            <div>
              <label className="label">Quantity change (+ to add, − to remove)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Reason</label>
              <input
                className="input"
                placeholder="e.g. damaged stock, stock take correction"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAdjustFor(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Apply Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
