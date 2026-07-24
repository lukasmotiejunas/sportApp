import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyToken, type TokenPayload } from '../auth/jwt.js';
import { HttpError } from './errorHandler.js';

// Make the authenticated user available on the request object.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Verifies the Bearer token and attaches the decoded user to req.user.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'Reikalinga autentifikacija.');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw new HttpError(401, 'Neteisingas arba pasibaigęs prisijungimas.');
  }
}

// Restricts a route to the given role(s). Use after requireAuth.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, 'Neturite teisių atlikti šį veiksmą.');
    }
    next();
  };
}

// Returns the clubId the current request is scoped to. Super-admin has no
// implicit club — if they hit a tenant-scoped route they must specify one via
// the ?clubId= query param.
export function requireClubId(req: Request): string {
  if (req.user?.role === 'super_admin') {
    const q = typeof req.query.clubId === 'string' ? req.query.clubId : undefined;
    if (!q) {
      throw new HttpError(400, 'clubId is required for super_admin requests.');
    }
    return q;
  }
  if (!req.user?.clubId) {
    throw new HttpError(403, 'Šiai paskyrai nepriskirtas klubas.');
  }
  return req.user.clubId;
}
