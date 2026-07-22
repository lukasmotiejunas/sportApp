import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  serializeLeaderboardCategory,
  serializeLeaderboardResult,
} from '../serialize.js';

export const leaderboardsRouter = Router();

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  event: z.string(),
  measurementType: z.enum(['seconds', 'ms', 'distance_km', 'points']),
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
  asyncHandler(async (_req, res) => {
    const categories = await prisma.leaderboardCategory.findMany();
    res.json(categories.map(serializeLeaderboardCategory));
  }),
);

leaderboardsRouter.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.leaderboardCategory.create({ data });
    res.status(201).json(serializeLeaderboardCategory(category));
  }),
);

leaderboardsRouter.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const { id: _ignoredId, ...patch } = categorySchema.partial().parse(req.body);
    const category = await prisma.leaderboardCategory.update({
      where: { id: req.params.id },
      data: patch,
    });
    res.json(serializeLeaderboardCategory(category));
  }),
);

// --- Results ---

leaderboardsRouter.get(
  '/results',
  asyncHandler(async (req, res) => {
    const categoryId =
      typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const results = await prisma.leaderboardResult.findMany({
      where: categoryId ? { categoryId } : undefined,
    });
    res.json(results.map(serializeLeaderboardResult));
  }),
);

leaderboardsRouter.post(
  '/results',
  asyncHandler(async (req, res) => {
    const data = resultSchema.parse(req.body);
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
    await prisma.leaderboardResult.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
