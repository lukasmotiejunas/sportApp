import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';

export const chatRouter = Router();

const MESSAGE_LIMIT = 100;

chatRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const messages = await prisma.clubMessage.findMany({
      where: { clubId },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
    });
    res.json(
      messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    );
  }),
);

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const { body } = bodySchema.parse(req.body);

    const userId = req.user!.userId;
    const role = req.user!.role;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { member: true, coach: true },
    });
    const authorName =
      user?.name ?? user?.member?.name ?? user?.coach?.name ?? 'Naudotojas';
    const authorType =
      role === 'member' ? 'member' : role === 'coach' ? 'coach' : 'admin';
    const authorPhoto = user?.member?.photoUrl ?? user?.coach?.photoUrl ?? null;
    const authorColor = user?.member?.avatarColor ?? user?.coach?.avatarColor ?? null;

    const msg = await prisma.clubMessage.create({
      data: { clubId, authorId: userId, authorType, authorName, authorPhoto, authorColor, body },
    });
    res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
  }),
);

chatRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const msg = await prisma.clubMessage.findFirst({
      where: { id: req.params.id, clubId },
    });
    if (!msg) throw new HttpError(404, 'Žinutė nerasta');

    const role = req.user!.role;
    const userId = req.user!.userId;
    const isOwner = msg.authorId === userId;
    const isPrivileged = role === 'admin' || role === 'coach' || role === 'super_admin';
    if (!isOwner && !isPrivileged) {
      throw new HttpError(403, 'Neturite teisių ištrinti šią žinutę.');
    }

    await prisma.clubMessage.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
