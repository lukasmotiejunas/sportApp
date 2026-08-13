import { Router } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyPassword, hashPassword } from '../auth/password.js';
import { signToken } from '../auth/jwt.js';
import { serializeUser } from '../serialize.js';
import { sendPasswordResetEmail } from '../email.js';

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
        clubLogo: user.club?.logoUrl ?? null,
        clubCity: user.club?.city ?? null,
        clubAddress: user.club?.address ?? null,
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
      clubLogo: user.club?.logoUrl ?? null,
      clubCity: user.club?.city ?? null,
      clubAddress: user.club?.address ?? null,
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

const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always respond with 200 — don't reveal whether the email exists.
    if (user) {
      // Invalidate any existing tokens for this user.
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

      const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ ok: true });
  }),
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new HttpError(400, 'Nuoroda negaliojanti arba pasibaigusi.');
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    res.json({ ok: true });
  }),
);
