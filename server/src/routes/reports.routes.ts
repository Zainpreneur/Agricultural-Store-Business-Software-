import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function parseRange(req: import('express').Request) {
  const from = req.query.from ? new Date(req.query.from as string) : new Date(0);
  const to = req.query.to ? new Date(req.query.to as string) : new Date();
  return { from, to };
}

// Sales report: totals + breakdown by day within a date range.
router.get('/sales', async (req, res) => {
  const { from, to } = parseRange(req);
  const sales = await prisma.sale.findMany({
    where: { date: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
    include: { items: true },
    orderBy: { date: 'asc' },
  });

  const byDay = new Map<string, { date: string; totalAmount: number; paidAmount: number; count: number }>();
  for (const s of sales) {
    const key = s.date.toISOString().slice(0, 10);
    const entry = byDay.get(key) || { date: key, totalAmount: 0, paidAmount: 0, count: 0 };
    entry.totalAmount += s.totalAmount;
    entry.paidAmount += s.paidAmount;
    entry.count += 1;
    byDay.set(key, entry);
  }

  res.json({
    from,
    to,
    totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    totalCollected: sales.reduce((sum, s) => sum + s.paidAmount, 0),
    totalOutstanding: sales.reduce((sum, s) => sum + (s.totalAmount - s.paidAmount), 0),
    saleCount: sales.length,
    byDay: Array.from(byDay.values()),
  });
});

// Purchases report similarly.
router.get('/purchases', async (req, res) => {
  const { from, to } = parseRange(req);
  const purchases = await prisma.purchase.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'asc' },
  });

  res.json({
    from,
    to,
    totalPurchased: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
    totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
    totalOwedToSuppliers: purchases.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0),
    purchaseCount: purchases.length,
  });
});

// Best-selling products by quantity & revenue within range.
router.get('/top-products', async (req, res) => {
  const { from, to } = parseRange(req);
  const items = await prisma.saleItem.findMany({
    where: { sale: { date: { gte: from, lte: to }, status: { not: 'CANCELLED' } } },
    include: { product: true },
  });

  const map = new Map<string, { productId: string; name: string; qtySold: number; revenue: number }>();
  for (const item of items) {
    const entry = map.get(item.productId) || {
      productId: item.productId,
      name: item.product.name,
      qtySold: 0,
      revenue: 0,
    };
    entry.qtySold += item.qty;
    entry.revenue += item.subtotal;
    map.set(item.productId, entry);
  }

  const top = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  res.json(top);
});

// Inventory valuation & low-stock snapshot.
router.get('/inventory', async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  res.json({
    totalStockValue: products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0),
    potentialRevenue: products.reduce((sum, p) => sum + p.stockQty * p.sellingPrice, 0),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || null,
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      lowStock: p.stockQty <= p.reorderLevel,
      stockValue: p.stockQty * p.costPrice,
    })),
  });
});

// Accounts receivable: customers with outstanding balances.
router.get('/receivables', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    where: { creditBalance: { gt: 0 } },
    orderBy: { creditBalance: 'desc' },
  });
  res.json({
    totalReceivable: customers.reduce((sum, c) => sum + c.creditBalance, 0),
    customers,
  });
});

export default router;
