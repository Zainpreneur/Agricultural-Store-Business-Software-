export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type PaymentMode = 'CASH' | 'CREDIT' | 'BANK' | 'MOBILE_MONEY' | 'CHEQUE';
export type SaleStatus = 'COMPLETED' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';
export type PurchaseStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  category?: Category | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  batchNo?: string | null;
  expiryDate?: string | null;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  _count?: { purchases: number };
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  creditBalance: number;
  creditLimit: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  qty: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId: string | null;
  customer?: Customer | null;
  date: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMode: PaymentMode;
  status: SaleStatus;
  items: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product?: Product;
  qty: number;
  costPrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplier?: Supplier;
  date: string;
  totalAmount: number;
  paidAmount: number;
  status: PurchaseStatus;
  items: PurchaseItem[];
}

export interface Payment {
  id: string;
  customerId: string;
  customer?: Customer;
  amount: number;
  mode: PaymentMode;
  note?: string | null;
  date: string;
}

export interface DashboardSummary {
  todaySalesTotal: number;
  todaySalesCollected: number;
  todaySalesCount: number;
  monthSalesTotal: number;
  monthSalesCount: number;
  activeProductCount: number;
  customerCount: number;
  totalOutstandingCredit: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  inventoryValue: number;
  expiringSoonCount: number;
  expiringSoonProducts: Product[];
}
