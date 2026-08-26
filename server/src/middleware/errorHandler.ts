import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Prisma unique constraint / known errors
  const anyErr = err as { code?: string; meta?: { target?: string[] }; message?: string };
  if (anyErr?.code === 'P2002') {
    return res.status(409).json({
      error: `Duplicate value for unique field: ${anyErr.meta?.target?.join(', ') ?? 'unknown'}`,
    });
  }
  if (anyErr?.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}
