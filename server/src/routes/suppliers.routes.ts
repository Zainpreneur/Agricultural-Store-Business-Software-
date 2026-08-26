import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.get('/', async (req, res) => {
  const q = (req.query.q as string) || undefined;
  const suppliers = await prisma.supplier.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(suppliers);
});

router.get('/:id', async (req, res) => {
  const supplier = await prisma.supplier.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { purchases: { orderBy: { date: 'desc' }, take: 20 } },
  });
  res.json(supplier);
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json(supplier);
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
  res.json(supplier);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.supplier.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
