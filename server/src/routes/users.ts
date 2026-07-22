import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { serializeUser } from '../serialize.js';

export const usersRouter = Router();

// Admin-only: list all login accounts.
usersRouter.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map(serializeUser));
  }),
);
