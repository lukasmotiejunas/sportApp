import { EventEmitter } from 'events';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireClubId } from '../middleware/auth.js';
import { verifyToken } from '../auth/jwt.js';

export const chatRouter = Router();

const MESSAGE_LIMIT = 100;

// Per-club event emitter. Lives for the lifetime of the process — works
// perfectly on a single server. On Vercel multi-instance deployments the
// 5-second polling fallback in the client catches anything that slips through.
const emitters = new Map<string, EventEmitter>();
function getEmitter(clubId: string): EventEmitter {
  let em = emitters.get(clubId);
  if (!em) {
    em = new EventEmitter();
    em.setMaxListeners(200);
    emitters.set(clubId, em);
  }
  return em;
}

function serializeMsg(m: {
  id: string; clubId: string; authorId: string; authorType: string;
  authorName: string; authorPhoto: string | null; authorColor: string | null;
  body: string; createdAt: Date;
}) {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

// SSE stream — auth via ?token= because EventSource can't set headers.
chatRouter.get('/stream', (req, res) => {
  const raw = req.query.token;
  if (typeof raw !== 'string') {
    res.status(401).json({ error: 'Reikalinga autentifikacija.' });
    return;
  }
  let payload;
  try {
    payload = verifyToken(raw);
  } catch {
    res.status(401).json({ error: 'Neteisingas prisijungimas.' });
    return;
  }

  // Resolve clubId the same way requireClubId does.
  let clubId: string;
  if (payload.role === 'super_admin') {
    const q = typeof req.query.clubId === 'string' ? req.query.clubId : undefined;
    if (!q) { res.status(400).json({ error: 'clubId required.' }); return; }
    clubId = q;
  } else {
    if (!payload.clubId) { res.status(403).json({ error: 'Nėra klubo.' }); return; }
    clubId = payload.clubId;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const keepAlive = setInterval(() => res.write(':ping\n\n'), 20000);

  const onMessage = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const em = getEmitter(clubId);
  em.on('message', onMessage);

  req.on('close', () => {
    clearInterval(keepAlive);
    em.off('message', onMessage);
  });
});

chatRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const messages = await prisma.clubMessage.findMany({
      where: { clubId },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_LIMIT,
    });
    res.json(messages.map(serializeMsg));
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

    const serialized = serializeMsg(msg);
    getEmitter(clubId).emit('message', serialized);

    res.status(201).json(serialized);
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
