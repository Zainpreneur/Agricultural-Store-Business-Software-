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
  costPrice: z.number().nonnegative(),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNo: z.string().min(1),
  items: z.array(itemSchema).min(1),
  paidAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

function nextInvoiceNo(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`;
}

router.get('/', async (req, res) => {
  const supplierId = (req.query.supplierId as string) || undefined;
  const purchases = await prisma.purchase.findMany({
    where: supplierId ? { supplierId } : undefined,
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(purchases);
});

router.get('/:id', async (req, res) => {
  const purchase = await prisma.purchase.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { supplier: true, items: { include: { product: true } }, createdBy: true },
  });
  res.json(purchase);
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  const data = purchaseSchema.parse(req.body);

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== new Set(productIds).size) {
    throw badRequest('One or more products not found');
  }

  const totalAmount = data.items.reduce((sum, i) => sum + i.qty * i.costPrice, 0);
  if (data.paidAmount > totalAmount) throw badRequest('paidAmount cannot exceed totalAmount');

  const status = data.paidAmount >= totalAmount ? 'PAID' : data.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        supplierId: data.supplierId,
        invoiceNo: data.invoiceNo || nextInvoiceNo('PO'),
        totalAmount,
        paidAmount: data.paidAmount,
        status,
        notes: data.notes,
        createdById: req.user!.sub,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            costPrice: i.costPrice,
            subtotal: i.qty * i.costPrice,
          })),
        },
      },
      include: { items: true },
    });

    // Receiving a purchase increases stock and updates the product's cost price.
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.qty }, costPrice: item.costPrice },
      });
    }

    return created;
  });

  res.status(201).json(purchase);
});

// Record an additional payment made to the supplier against an existing purchase.
const paySchema = z.object({ amount: z.number().positive() });
router.post('/:id/pay', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const { amount } = paySchema.parse(req.body);
  const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: req.params.id } });

  const newPaid = purchase.paidAmount + amount;
  if (newPaid > purchase.totalAmount) throw badRequest('Payment would exceed total amount owed');

  const status = newPaid >= purchase.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
  const updated = await prisma.purchase.update({
    where: { id: purchase.id },
    data: { paidAmount: newPaid, status },
  });
  res.json(updated);
});

export default router;
