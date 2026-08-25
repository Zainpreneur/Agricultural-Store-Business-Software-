import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get('/summary', async (_req, res) => {
  const todayStart = startOfDay();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [todaySales, monthSales, products, customers, allCreditBalances, activeProducts] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { date: { gte: todayStart }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { date: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.customer.count(),
      prisma.customer.aggregate({ _sum: { creditBalance: true } }),
      prisma.product.findMany({ where: { active: true } }),
    ]);

  const lowStock = activeProducts.filter((p) => p.stockQty <= p.reorderLevel);
  const inventoryValue = activeProducts.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);

  const soonExpiring = activeProducts.filter(
    (p) => p.expiryDate && p.expiryDate.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30 && p.expiryDate.getTime() > 0,
  );

  res.json({
    todaySalesTotal: todaySales._sum.totalAmount || 0,
    todaySalesCollected: todaySales._sum.paidAmount || 0,
    todaySalesCount: todaySales._count,
    monthSalesTotal: monthSales._sum.totalAmount || 0,
    monthSalesCount: monthSales._count,
    activeProductCount: products,
    customerCount: customers,
    totalOutstandingCredit: allCreditBalances._sum.creditBalance || 0,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock.slice(0, 10),
    inventoryValue,
    expiringSoonCount: soonExpiring.length,
    expiringSoonProducts: soonExpiring.slice(0, 10),
  });
});

export default router;
