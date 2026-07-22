import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES_IN = '7d';

export type TokenPayload = {
  userId: string;
  role: Role;
  memberId?: string | null;
  coachId?: string | null;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
