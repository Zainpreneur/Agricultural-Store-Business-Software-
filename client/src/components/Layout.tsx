import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/sales/new', label: 'New Sale (POS)', icon: '🧾', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/sales', label: 'Sales', icon: '💰', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/products', label: 'Products', icon: '🌱', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/categories', label: 'Categories', icon: '🗂️', roles: ['ADMIN', 'MANAGER'] },
  { to: '/customers', label: 'Customers', icon: '👨‍🌾', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/payments', label: 'Payments', icon: '💵', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/suppliers', label: 'Suppliers', icon: '🚚', roles: ['ADMIN', 'MANAGER'] },
  { to: '/purchases', label: 'Purchases', icon: '📦', roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Users', icon: '🔑', roles: ['ADMIN'] },
];

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside className="w-64 shrink-0 bg-agri-800 text-agri-50 flex flex-col">
        <div className="px-4 py-5 border-b border-agri-700">
          <div className="text-xl font-bold flex items-center gap-2">
            <span>🌾</span> AgriStore
          </div>
          <div className="text-xs text-agri-200 mt-0.5">Business Manager</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems
            .filter((item) => hasRole(...item.roles))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-agri-600 text-white'
                      : 'text-agri-100 hover:bg-agri-700 hover:text-white'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="px-4 py-4 border-t border-agri-700 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="text-agri-300 text-xs mb-2">{user?.role}</div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-agri-200 hover:text-white text-xs underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
