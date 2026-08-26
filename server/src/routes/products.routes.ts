import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { badRequest } from '../utils/errors';

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  unit: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQty: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(10),
  batchNo: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

router.get('/', async (req, res) => {
  const q = (req.query.q as string) || undefined;
  const categoryId = (req.query.categoryId as string) || undefined;
  const lowStock = req.query.lowStock === 'true';
  const activeOnly = req.query.all !== 'true';

  const products = await prisma.product.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] }
        : {}),
    },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const filtered = lowStock ? products.filter((p) => p.stockQty <= p.reorderLevel) : products;
  res.json(filtered);
});

router.get('/:id', async (req, res) => {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { category: true },
  });
  res.json(product);
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({
    data: { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null },
  });
  res.status(201).json(product);
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = productSchema.partial().parse(req.body);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined },
  });
  res.json(product);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  // Soft-delete: keep historical sale/purchase records intact.
  await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).end();
});

// Manual stock adjustment (damage, correction, stock take, etc.)
const adjustSchema = z.object({
  qtyChange: z.number().refine((n) => n !== 0, 'qtyChange must not be 0'),
  reason: z.string().min(1),
});

router.post('/:id/adjust', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = adjustSchema.parse(req.body);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } });

  const newQty = product.stockQty + data.qtyChange;
  if (newQty < 0) throw badRequest('Adjustment would result in negative stock');

  const [, adjustment] = await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { stockQty: newQty } }),
    prisma.stockAdjustment.create({
      data: { productId: product.id, qtyChange: data.qtyChange, reason: data.reason },
    }),
  ]);

  res.status(201).json(adjustment);
});

export default router;
