import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { HttpError } from './errorHandler.js';

// Blocks club-scoped routes when the club's platform subscription is not in
// an OK state (past_due, cancelled). Super_admin bypasses.
//
// Mount AFTER requireAuth. Any 403 with `{ error: 'subscription_suspended' }`
// tells the frontend to redirect the user to the suspension screen.
export async function requireActiveSubscription(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Reikalinga autentifikacija.');

  // Platform-level roles have no club to gate.
  if (user.role === 'super_admin') return next();
  if (!user.clubId) return next();

  const sub = await prisma.clubSubscription.findUnique({
    where: { clubId: user.clubId },
    select: { status: true },
  });

  // No subscription row => legacy club (pre-Stripe). Let it through.
  if (!sub) return next();

  if (sub.status === 'past_due' || sub.status === 'cancelled') {
    throw new HttpError(403, 'subscription_suspended');
  }

  next();
}
