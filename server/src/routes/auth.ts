import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { serializeUser } from '../serialize.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { club: { include: { subscription: true } } },
    });
    if (!user) throw new HttpError(401, 'Neteisingas el. paštas arba slaptažodis.');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Neteisingas el. paštas arba slaptažodis.');

    const token = signToken({
      userId: user.id,
      role: user.role,
      clubId: user.clubId,
      memberId: user.memberId,
      coachId: user.coachId,
    });

    const sub = user.club?.subscription;
    res.json({
      token,
      user: {
        ...serializeUser(user),
        subscription: sub
          ? {
              status: sub.status,
              trialEndsAt: sub.trialEndsAt.toISOString(),
              currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
            }
          : null,
      },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { club: { include: { subscription: true } } },
    });
    if (!user) throw new HttpError(404, 'Vartotojas nerastas.');

    const sub = user.club?.subscription;
    res.json({
      ...serializeUser(user),
      subscription: sub
        ? {
            status: sub.status,
            trialEndsAt: sub.trialEndsAt.toISOString(),
            currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          }
        : null,
    });
  }),
);
