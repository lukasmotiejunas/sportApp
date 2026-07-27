import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { serializeUser } from '../serialize.js';

export const profileRouter = Router();

const updateSelfSchema = z.object({
  name: z.string().min(2, 'Vardas per trumpas.').max(120).optional(),
  email: z.string().email('Neteisingas el. paštas.').optional(),
});

// PUT / — update own name and/or email. Rejects duplicate email.
profileRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const data = updateSelfSchema.parse(req.body);

    if (data.email) {
      const email = data.email.toLowerCase();
      const clash = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (clash) {
        throw new HttpError(409, 'Vartotojas su tokiu el. paštu jau egzistuoja.');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      },
      include: { club: true },
    });

    res.json(serializeUser(updated));
  }),
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Įveskite dabartinį slaptažodį.'),
  newPassword: z
    .string()
    .min(6, 'Naujas slaptažodis turi būti bent 6 simbolių.'),
});

// POST /password — self password change. Requires current password.
profileRouter.post(
  '/password',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Vartotojas nerastas.');

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new HttpError(400, 'Neteisingas dabartinis slaptažodis.');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    res.status(204).end();
  }),
);

const updateClubSchema = z.object({
  name: z.string().min(2, 'Klubo pavadinimas per trumpas.').max(120),
});

// PUT /club — admin-only, update own club's name.
profileRouter.put(
  '/club',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const clubId = req.user!.clubId;
    if (!clubId) throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');

    const { name } = updateClubSchema.parse(req.body);

    const updated = await prisma.club.update({
      where: { id: clubId },
      data: { name },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    });
  }),
);
