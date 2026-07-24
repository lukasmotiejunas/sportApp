import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeUser } from '../serialize.js';

export const usersRouter = Router();

// Admin-only: list login accounts within the current club.
usersRouter.get(
  '/',
  requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const users = await prisma.user.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(serializeUser));
  }),
);
