import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { Product, Customer, PaymentMode } from '../types';
import { formatMoney } from '../utils/format';

interface CartLine {
  product: Product;
  qty: number;
  price: number;
}

export default function SaleNew() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaleInvoice, setLastSaleInvoice] = useState<string | null>(null);

  useEffect(() => {
    api.get<Product[]>('/products').then((res) => setProducts(res.data));
    api.get<Customer[]>('/customers').then((res) => setCustomers(res.data));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const s = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
      .slice(0, 8);
  }, [search, products]);

  function addToCart(product: Product) {
    setSearch('');
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: Math.min(l.qty + 1, product.stockQty) } : l,
        );
      }
      return [...prev, { product, qty: 1, price: product.sellingPrice }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, qty } : l)));
  }

  function updatePrice(productId: string, price: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, price } : l)));
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.qty * l.price, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const effectivePaid = paymentMode === 'CASH' ? total : Number(paidAmount || 0);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  async function handleSubmit() {
    setError('');
    if (cart.length === 0) return setError('Add at least one product to the cart');
    if (paymentMode === 'CREDIT' && !customerId) return setError('Select a customer for credit sales');
    if (effectivePaid > total) return setError('Amount paid cannot exceed total');

    setSaving(true);
    try {
      const res = await api.post('/sales', {
        customerId: customerId || null,
        items: cart.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.price })),
        discount: Number(discount || 0),
        paidAmount: effectivePaid,
        paymentMode,
      });
      setLastSaleInvoice(res.data.invoiceNo);
      setCart([]);
      setDiscount('0');
      setPaidAmount('');
      setCustomerId('');
      setPaymentMode('CASH');
      // refresh product stock levels
      api.get<Product[]>('/products').then((r) => setProducts(r.data));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">New Sale (POS)</h1>

      {lastSaleInvoice && (
        <div className="bg-agri-50 border border-agri-200 text-agri-800 rounded-md px-4 py-2 text-sm flex items-center justify-between">
          <span>✅ Sale {lastSaleInvoice} recorded successfully.</span>
          <button className="underline" onClick={() => setLastSaleInvoice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 relative">
            <label className="label">Search product by name or SKU</label>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search…"
              autoFocus
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 left-4 right-4 mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={p.stockQty <= 0}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-agri-50 disabled:opacity-40 text-left"
                  >
                    <span>
                      {p.name} <span className="text-stone-400">({p.sku})</span>
                    </span>
                    <span className="text-stone-500">
                      ${formatMoney(p.sellingPrice)} · {p.stockQty} {p.unit} left
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-stone-400 py-8">
                      Cart is empty. Search above to add products.
                    </td>
                  </tr>
                ) : (
                  cart.map((l) => (
                    <tr key={l.product.id}>
                      <td className="font-medium">{l.product.name}</td>
                      <td>
                        <input
                          type="number"
                          min="0.01"
                          max={l.product.stockQty}
                          step="0.01"
                          className="input w-20"
                          value={l.qty}
                          onChange={(e) => updateQty(l.product.id, Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input w-24"
                          value={l.price}
                          onChange={(e) => updatePrice(l.product.id, Number(e.target.value))}
                        />
                      </td>
                      <td>${formatMoney(l.qty * l.price)}</td>
                      <td>
                        <button
                          className="text-red-500 text-xs"
                          onClick={() => removeFromCart(l.product.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4 space-y-4 h-fit">
          <div>
            <label className="label">Customer</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.creditBalance > 0 ? `(owes $${formatMoney(c.creditBalance)})` : ''}
                </option>
              ))}
            </select>
            {selectedCustomer && selectedCustomer.creditLimit > 0 && (
              <p className="text-xs text-stone-400 mt-1">
                Credit limit: ${formatMoney(selectedCustomer.creditLimit)}
              </p>
            )}
          </div>

          <div>
            <label className="label">Discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Payment Mode</label>
            <select
              className="input"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
            >
              <option value="CASH">Cash (paid in full)</option>
              <option value="BANK">Bank Transfer</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT">Credit (Khata / Pay Later)</option>
            </select>
          </div>

          {paymentMode !== 'CASH' && (
            <div>
              <label className="label">Amount Paid Now</label>
              <input
                type="number"
                min="0"
                max={total}
                step="0.01"
                className="input"
                placeholder={paymentMode === 'CREDIT' ? '0 for full credit' : String(total)}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          )}

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span>${formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Discount</span>
              <span>-${formatMoney(Number(discount || 0))}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-stone-800">
              <span>Total</span>
              <span>${formatMoney(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Paying now</span>
              <span>${formatMoney(effectivePaid)}</span>
            </div>
            {total - effectivePaid > 0 && (
              <div className="flex justify-between text-amber-600 font-medium">
                <span>Balance (credit)</span>
                <span>${formatMoney(total - effectivePaid)}</span>
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button className="btn-primary w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Processing…' : 'Complete Sale'}
          </button>
          <button className="btn-secondary w-full" onClick={() => navigate('/sales')}>
            View Sales History
          </button>
        </div>
      </div>
    </div>
  );
}
