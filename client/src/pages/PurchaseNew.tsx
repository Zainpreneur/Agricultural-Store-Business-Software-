import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Supplier, Product } from '../types';
import { formatMoney } from '../utils/format';

interface Line {
  productId: string;
  qty: string;
  costPrice: string;
}

export default function PurchaseNew() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', qty: '1', costPrice: '0' }]);
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Supplier[]>('/suppliers').then((res) => setSuppliers(res.data));
    api.get<Product[]>('/products?all=true').then((res) => setProducts(res.data));
  }, []);

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: '', qty: '1', costPrice: '0' }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function onProductChange(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(idx, { productId, costPrice: product ? String(product.costPrice) : '0' });
  }

  const total = lines.reduce((sum, l) => sum + Number(l.qty || 0) * Number(l.costPrice || 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!supplierId) return setError('Select a supplier');
    const items = lines
      .filter((l) => l.productId && Number(l.qty) > 0)
      .map((l) => ({ productId: l.productId, qty: Number(l.qty), costPrice: Number(l.costPrice) }));
    if (items.length === 0) return setError('Add at least one line item');

    setSaving(true);
    try {
      await api.post('/purchases', {
        supplierId,
        invoiceNo: invoiceNo || undefined,
        items,
        paidAmount: Number(paidAmount),
        notes: notes || undefined,
      });
      navigate('/purchases');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-stone-800">New Purchase (Stock Receiving)</h1>

      <form onSubmit={handleSubmit} className="card p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Supplier</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Invoice / Reference No. (optional)</label>
            <input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Line Items</label>
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="input flex-1"
                    value={line.productId}
                    onChange={(e) => onProductChange(idx, e.target.value)}
                    required
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input w-24"
                    placeholder="Qty"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, { qty: e.target.value })}
                    required
                  />
                  <span className="text-xs text-stone-400 w-14">{product?.unit || ''}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input w-28"
                    placeholder="Cost"
                    value={line.costPrice}
                    onChange={(e) => updateLine(idx, { costPrice: e.target.value })}
                    required
                  />
                  <span className="text-sm text-stone-500 w-24 text-right">
                    ${formatMoney(Number(line.qty || 0) * Number(line.costPrice || 0))}
                  </span>
                  <button
                    type="button"
                    className="text-red-500 text-xs"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-secondary mt-2" onClick={addLine}>
            + Add Line
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount Paid Now</label>
            <input
              type="number"
              min="0"
              max={total}
              step="0.01"
              className="input"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
          </div>
          <div className="text-right self-end">
            <div className="text-sm text-stone-500">Total</div>
            <div className="text-2xl font-bold text-stone-800">${formatMoney(total)}</div>
          </div>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/purchases')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
}
