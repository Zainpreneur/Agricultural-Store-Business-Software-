import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { badRequest } from '../utils/errors';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive(),
  price: z.number().nonnegative().optional(), // defaults to product.sellingPrice
});

const saleSchema = z.object({
  customerId: z.string().optional().nullable(), // null/omitted = walk-in customer
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  paidAmount: z.number().nonnegative(),
  paymentMode: z.enum(['CASH', 'CREDIT', 'BANK', 'MOBILE_MONEY', 'CHEQUE']).default('CASH'),
  notes: z.string().optional(),
});

function nextInvoiceNo(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`;
}

router.get('/', async (req, res) => {
  const customerId = (req.query.customerId as string) || undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  const sales = await prisma.sale.findMany({
    where: {
      ...(customerId ? { customerId } : {}),
      ...(from || to ? { date: { gte: from, lte: to } } : {}),
    },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(sales);
});

router.get('/:id', async (req, res) => {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { customer: true, items: { include: { product: true } }, createdBy: true },
  });
  res.json(sale);
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  const data = saleSchema.parse(req.body);

  if (data.paymentMode === 'CREDIT' && !data.customerId) {
    throw badRequest('A customer must be selected for credit sales');
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  if (products.length !== new Set(productIds).size) {
    throw badRequest('One or more products not found');
  }

  for (const item of data.items) {
    const product = productMap.get(item.productId)!;
    if (product.stockQty < item.qty) {
      throw badRequest(`Insufficient stock for "${product.name}" (have ${product.stockQty}, need ${item.qty})`);
    }
  }

  const subtotal = data.items.reduce((sum, i) => {
    const price = i.price ?? productMap.get(i.productId)!.sellingPrice;
    return sum + price * i.qty;
  }, 0);
  const totalAmount = Math.max(0, subtotal - data.discount);

  if (data.paidAmount > totalAmount) throw badRequest('paidAmount cannot exceed totalAmount');

  let customer = null;
  if (data.customerId) {
    customer = await prisma.customer.findUniqueOrThrow({ where: { id: data.customerId } });
    const owedAfterSale = customer.creditBalance + (totalAmount - data.paidAmount);
    if (customer.creditLimit > 0 && owedAfterSale > customer.creditLimit) {
      throw badRequest(
        `Sale would exceed customer's credit limit (limit ${customer.creditLimit}, would owe ${owedAfterSale})`,
      );
    }
  }

  const status =
    data.paidAmount >= totalAmount ? 'COMPLETED' : data.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerId: data.customerId || null,
        invoiceNo: nextInvoiceNo('INV'),
        subtotal,
        discount: data.discount,
        totalAmount,
        paidAmount: data.paidAmount,
        paymentMode: data.paymentMode,
        status,
        notes: data.notes,
        createdById: req.user!.sub,
        items: {
          create: data.items.map((i) => {
            const price = i.price ?? productMap.get(i.productId)!.sellingPrice;
            return { productId: i.productId, qty: i.qty, price, subtotal: price * i.qty };
          }),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.qty } },
      });
    }

    const outstanding = totalAmount - data.paidAmount;
    if (data.customerId && outstanding !== 0) {
      await tx.customer.update({
        where: { id: data.customerId },
        data: { creditBalance: { increment: outstanding } },
      });
    }

    return created;
  });

  res.status(201).json(sale);
});

router.post('/:id/cancel', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (sale.status === 'CANCELLED') throw badRequest('Sale is already cancelled');

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.qty } },
      });
    }
    if (sale.customerId) {
      const outstanding = sale.totalAmount - sale.paidAmount;
      if (outstanding !== 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { creditBalance: { decrement: outstanding } },
        });
      }
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'CANCELLED' } });
  });

  res.json({ ok: true });
});

export default router;
