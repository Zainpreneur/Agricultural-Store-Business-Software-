import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const categorySchema = z.object({ name: z.string().min(1) });

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = categorySchema.parse(req.body);
  const category = await prisma.category.create({ data });
  res.status(201).json(category);
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = categorySchema.parse(req.body);
  const category = await prisma.category.update({ where: { id: req.params.id }, data });
  res.json(category);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
