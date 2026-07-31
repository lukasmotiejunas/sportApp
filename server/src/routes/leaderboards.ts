import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';
import {
  serializeLeaderboardCategory,
  serializeLeaderboardResult,
} from '../serialize.js';

export const leaderboardsRouter = Router();

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  event: z.string(),
  measurementType: z.enum(['seconds', 'distance_km', 'distance_m', 'minutes', 'kg']),
  unit: z.string(),
  lowerIsBetter: z.boolean(),
  genderCategory: z.enum(['male', 'female', 'all']),
  archived: z.boolean().optional().default(false),
});

const resultSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string(),
  memberId: z.string(),
  value: z.number(),
  date: z.string(),
  note: z.string().optional(),
});

// --- Categories ---

leaderboardsRouter.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const categories = await prisma.leaderboardCategory.findMany({ where: { clubId } });
    res.json(categories.map(serializeLeaderboardCategory));
  }),
);

leaderboardsRouter.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = categorySchema.parse(req.body);
    const category = await prisma.leaderboardCategory.create({
      data: { ...data, clubId },
    });
    res.status(201).json(serializeLeaderboardCategory(category));
  }),
);

leaderboardsRouter.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.leaderboardCategory.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Kategorija nerasta');

    const { id: _ignoredId, ...patch } = categorySchema.partial().parse(req.body);
    const category = await prisma.leaderboardCategory.update({
      where: { id: req.params.id },
      data: patch,
    });
    res.json(serializeLeaderboardCategory(category));
  }),
);

// --- Results ---
// Results are scoped via their category (category has clubId).

leaderboardsRouter.get(
  '/results',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const categoryId =
      typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const results = await prisma.leaderboardResult.findMany({
      where: {
        category: { clubId },
        ...(categoryId ? { categoryId } : {}),
      },
    });
    res.json(results.map(serializeLeaderboardResult));
  }),
);

leaderboardsRouter.post(
  '/results',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = resultSchema.parse(req.body);

    const [category, member] = await Promise.all([
      prisma.leaderboardCategory.findFirst({ where: { id: data.categoryId, clubId } }),
      prisma.member.findFirst({ where: { id: data.memberId, clubId } }),
    ]);
    if (!category) throw new HttpError(400, 'Kategorija nepriklauso šiam klubui.');
    if (!member) throw new HttpError(400, 'Narys nepriklauso šiam klubui.');

    const result = await prisma.leaderboardResult.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        categoryId: data.categoryId,
        memberId: data.memberId,
        value: data.value,
        date: new Date(data.date),
        note: data.note,
      },
    });
    res.status(201).json(serializeLeaderboardResult(result));
  }),
);

leaderboardsRouter.patch(
  '/results/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.leaderboardResult.findFirst({
      where: { id: req.params.id, category: { clubId } },
    });
    if (!existing) throw new HttpError(404, 'Rezultatas nerastas');

    const patch = resultSchema.partial().parse(req.body);
    const { id: _ignoredId, date, ...rest } = patch;
    const result = await prisma.leaderboardResult.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(date !== undefined ? { date: new Date(date) } : {}),
      },
    });
    res.json(serializeLeaderboardResult(result));
  }),
);

leaderboardsRouter.delete(
  '/results/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.leaderboardResult.findFirst({
      where: { id: req.params.id, category: { clubId } },
    });
    if (!existing) throw new HttpError(404, 'Rezultatas nerastas');

    await prisma.leaderboardResult.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
