import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@agristore.test');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-agri-800 to-agri-600 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🌾</div>
          <h1 className="text-xl font-bold text-stone-800">AgriStore</h1>
          <p className="text-sm text-stone-500">Sign in to your store account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-5 text-xs text-stone-400 border-t pt-4">
          <p className="font-medium mb-1">Demo accounts (seeded):</p>
          <p>Admin: admin@agristore.test / Admin@123</p>
          <p>Cashier: cashier@agristore.test / Cashier@123</p>
        </div>
      </div>
    </div>
  );
}
