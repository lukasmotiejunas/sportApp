import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId, requireRole } from '../middleware/auth.js';
import { serializeTrainingTemplate } from '../serialize.js';

export const trainingTemplatesRouter = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional().default(''),
  description: z.string().optional().default(''),
  location: z.string().optional().default(''),
  startTime: z.string().optional().default(''),
  endTime: z.string().optional().default(''),
  capacity: z.number().int().min(1).nullable().optional(),
  defaultPlan: z.string().optional().default(''),
});

trainingTemplatesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const items = await prisma.trainingTemplate.findMany({
      where: { clubId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(items.map(serializeTrainingTemplate));
  }),
);

trainingTemplatesRouter.post(
  '/',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const data = templateSchema.parse(req.body);
    const created = await prisma.trainingTemplate.create({
      data: {
        clubId,
        name: data.name,
        title: data.title || null,
        description: data.description || null,
        location: data.location || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        capacity: data.capacity ?? null,
        defaultPlan: data.defaultPlan || null,
      },
    });
    res.status(201).json(serializeTrainingTemplate(created));
  }),
);

trainingTemplatesRouter.patch(
  '/:id',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingTemplate.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotės planas nerastas.');
    const data = templateSchema.partial().parse(req.body);
    const updated = await prisma.trainingTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.title !== undefined ? { title: data.title || null } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.location !== undefined
          ? { location: data.location || null }
          : {}),
        ...(data.startTime !== undefined
          ? { startTime: data.startTime || null }
          : {}),
        ...(data.endTime !== undefined
          ? { endTime: data.endTime || null }
          : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity ?? null } : {}),
        ...(data.defaultPlan !== undefined
          ? { defaultPlan: data.defaultPlan || null }
          : {}),
      },
    });
    res.json(serializeTrainingTemplate(updated));
  }),
);

trainingTemplatesRouter.delete(
  '/:id',
  requireRole('admin', 'coach', 'super_admin'),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const existing = await prisma.trainingTemplate.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!existing) throw new HttpError(404, 'Treniruotės planas nerastas.');
    await prisma.trainingTemplate.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
