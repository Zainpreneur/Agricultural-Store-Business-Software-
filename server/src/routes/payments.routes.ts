import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { badRequest } from '../utils/errors';

const router = Router();
router.use(requireAuth);

const paymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().positive(),
  mode: z.enum(['CASH', 'CREDIT', 'BANK', 'MOBILE_MONEY', 'CHEQUE']).default('CASH'),
  note: z.string().optional(),
});

router.get('/', async (req, res) => {
  const customerId = (req.query.customerId as string) || undefined;
  const payments = await prisma.payment.findMany({
    where: customerId ? { customerId } : undefined,
    include: { customer: true, receivedBy: true },
    orderBy: { date: 'desc' },
  });
  res.json(payments);
});

// Record a payment a customer makes against their outstanding credit balance.
router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  const data = paymentSchema.parse(req.body);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: data.customerId } });

  if (data.amount > customer.creditBalance) {
    throw badRequest(
      `Payment (${data.amount}) exceeds outstanding balance (${customer.creditBalance})`,
    );
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        mode: data.mode,
        note: data.note,
        receivedById: req.user!.sub,
      },
    }),
    prisma.customer.update({
      where: { id: data.customerId },
      data: { creditBalance: { decrement: data.amount } },
    }),
  ]);

  res.status(201).json(payment);
});

export default router;
