import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleGate } from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Customers from './pages/Customers';
import CustomerLedger from './pages/CustomerLedger';
import Purchases from './pages/Purchases';
import PurchaseNew from './pages/PurchaseNew';
import Sales from './pages/Sales';
import SaleNew from './pages/SaleNew';
import SaleDetail from './pages/SaleDetail';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Users from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route
              path="categories"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <Categories />
                </RoleGate>
              }
            />
            <Route
              path="suppliers"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <Suppliers />
                </RoleGate>
              }
            />
            <Route
              path="suppliers/:id"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <SupplierDetail />
                </RoleGate>
              }
            />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerLedger />} />
            <Route
              path="purchases"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <Purchases />
                </RoleGate>
              }
            />
            <Route
              path="purchases/new"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <PurchaseNew />
                </RoleGate>
              }
            />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<SaleNew />} />
            <Route path="sales/:id" element={<SaleDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route
              path="reports"
              element={
                <RoleGate roles={['ADMIN', 'MANAGER']}>
                  <Reports />
                </RoleGate>
              }
            />
            <Route
              path="users"
              element={
                <RoleGate roles={['ADMIN']}>
                  <Users />
                </RoleGate>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
