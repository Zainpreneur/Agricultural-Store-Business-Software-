import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0),
});

router.get('/', async (req, res) => {
  const q = (req.query.q as string) || undefined;
  const withBalanceOnly = req.query.withBalance === 'true';
  const customers = await prisma.customer.findMany({
    where: q ? { name: { contains: q } } : undefined,
    orderBy: { name: 'asc' },
  });
  res.json(withBalanceOnly ? customers.filter((c) => c.creditBalance > 0) : customers);
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json(customer);
});

// Full statement / ledger: sales (debits) and payments (credits) chronologically.
router.get('/:id/ledger', async (req, res) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: req.params.id } });
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({ where: { customerId: customer.id }, orderBy: { date: 'asc' } }),
    prisma.payment.findMany({ where: { customerId: customer.id }, orderBy: { date: 'asc' } }),
  ]);

  const entries = [
    ...sales.map((s) => ({
      type: 'SALE' as const,
      id: s.id,
      date: s.date,
      reference: s.invoiceNo,
      debit: s.totalAmount, // increases what customer owes
      credit: s.paidAmount, // amount already paid at time of sale
    })),
    ...payments.map((p) => ({
      type: 'PAYMENT' as const,
      id: p.id,
      date: p.date,
      reference: p.mode,
      debit: 0,
      credit: p.amount,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const withRunning = entries.map((e) => {
    running += e.debit - e.credit;
    return { ...e, balance: running };
  });

  res.json({ customer, entries: withRunning, currentBalance: customer.creditBalance });
});

router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req, res) => {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({ data });
  res.status(201).json(customer);
});

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = customerSchema.partial().parse(req.body);
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
  res.json(customer);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

export default router;
