import { PrismaClient } from '@prisma/client';

// Reuse a single PrismaClient across warm serverless invocations to avoid
// exhausting database connections. In local dev the same instance is reused
// across hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
