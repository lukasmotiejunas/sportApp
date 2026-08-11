import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { serializeCoach, serializeUser } from '../serialize.js';
import { initialsFromName, randomAvatarColor } from '../util.js';

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

const updateCoachSelfSchema = z.object({
  name: z.string().min(2, 'Vardas per trumpas.').max(120).optional(),
  specialty: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  // Data URL (image/*;base64,...) or empty string to clear.
  photoUrl: z.string().max(300_000).nullable().optional(),
});

// PUT /coach — coach self-service update of Coach profile fields. Name syncs
// to the linked User row so it stays consistent with the login identity.
profileRouter.put(
  '/coach',
  requireRole('coach'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.coachId) throw new HttpError(404, 'Trenerio profilis nerastas.');

    const data = updateCoachSelfSchema.parse(req.body);
    if (
      data.name === undefined &&
      data.specialty === undefined &&
      data.phone === undefined &&
      data.photoUrl === undefined
    ) {
      throw new HttpError(400, 'Nėra ką atnaujinti.');
    }

    const updated = await prisma.coach.update({
      where: { id: user.coachId },
      data: {
        ...(data.name !== undefined
          ? { name: data.name, initials: initialsFromName(data.name) }
          : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.photoUrl !== undefined
          ? { photoUrl: data.photoUrl === '' ? null : data.photoUrl }
          : {}),
      },
    });

    if (data.name !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: data.name },
      });
    }

    res.json(serializeCoach(updated));
  }),
);

// POST /ensure-coach — idempotent. Creates a Coach record for the admin user
// if they don't have one, so they can be selected as a trainer in sessions.
profileRouter.post(
  '/ensure-coach',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'Vartotojas nerastas.');
    if (!user.clubId) throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');

    if (user.coachId) {
      const existing = await prisma.coach.findUnique({ where: { id: user.coachId } });
      if (existing) return res.json(serializeCoach(existing));
    }

    const coach = await prisma.coach.create({
      data: {
        clubId: user.clubId,
        name: user.name ?? 'Administratorius',
        initials: initialsFromName(user.name ?? 'Administratorius'),
        avatarColor: randomAvatarColor(),
      },
    });
    await prisma.user.update({ where: { id: userId }, data: { coachId: coach.id } });
    res.json(serializeCoach(coach));
  }),
);

const notificationSettingsSchema = z.object({
  notifyNewMember: z.boolean().optional(),
  notifyNewTraining: z.boolean().optional(),
  notifyPayment: z.boolean().optional(),
});

// GET /notifications — return current club notification toggles.
profileRouter.get(
  '/notifications',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const clubId = req.user!.clubId;
    if (!clubId) throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { notifyNewMember: true, notifyNewTraining: true, notifyPayment: true } });
    if (!club) throw new HttpError(404, 'Klubas nerastas.');
    res.json(club);
  }),
);

// PATCH /notifications — update club notification toggles.
profileRouter.patch(
  '/notifications',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const clubId = req.user!.clubId;
    if (!clubId) throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');
    const data = notificationSettingsSchema.parse(req.body);
    const updated = await prisma.club.update({
      where: { id: clubId },
      data,
      select: { notifyNewMember: true, notifyNewTraining: true, notifyPayment: true },
    });
    res.json(updated);
  }),
);

const updateClubSchema = z.object({
  name: z.string().min(2, 'Klubo pavadinimas per trumpas.').max(120).optional(),
  // Data URL (image/*;base64,...) or empty string / null to clear.
  // ~200KB max — resized on the client to keep DB rows lean.
  logoUrl: z.string().max(300_000).nullable().optional(),
});

// PUT /club — admin-only, update own club's name and/or logo.
profileRouter.put(
  '/club',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const clubId = req.user!.clubId;
    if (!clubId) throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');

    const data = updateClubSchema.parse(req.body);
    if (data.name === undefined && data.logoUrl === undefined) {
      throw new HttpError(400, 'Nėra ką atnaujinti.');
    }

    const updated = await prisma.club.update({
      where: { id: clubId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined
          ? { logoUrl: data.logoUrl === '' ? null : data.logoUrl }
          : {}),
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl ?? null,
    });
  }),
);
