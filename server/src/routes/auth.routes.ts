import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { badRequest, unauthorized } from '../utils/errors';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Public: bootstrap the very first admin account when no users exist yet.
// Afterwards, only an ADMIN can create new users via POST /auth/register.
router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    // Require an authenticated admin for subsequent registrations.
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('Only an existing admin can register new users');
    }
    const { verifyToken } = await import('../utils/jwt');
    let payload;
    try {
      payload = verifyToken(header.slice(7));
    } catch {
      throw unauthorized('Invalid or expired token');
    }
    if (payload.role !== 'ADMIN') throw unauthorized('Only an admin can register new users');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw badRequest('Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const role = userCount === 0 ? 'ADMIN' : data.role || 'CASHIER';

  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role },
  });

  const token = signToken({ sub: user.id, role: user.role, name: user.name });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post('/login', async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.active) throw unauthorized('Invalid credentials');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw unauthorized('Invalid credentials');

  const token = signToken({ sub: user.id, role: user.role, name: user.name });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) throw unauthorized();
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.get('/users', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.patch('/users/:id/active', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const schema = z.object({ active: z.boolean() });
  const { active } = schema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { active } });
  res.json({ id: user.id, active: user.active });
});

export default router;
