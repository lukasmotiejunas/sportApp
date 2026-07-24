import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Idempotently creates (or updates) the platform-level super_admin login.
// Run manually against any environment where you need to add yourself as
// super_admin without touching club data:
//     npx tsx prisma/bootstrap-super-admin.ts
const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'lukas@kartel.ai').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'super-admin-123';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Platform Owner';

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'super_admin', passwordHash, name, clubId: null },
    create: { email, role: 'super_admin', passwordHash, name },
  });

  console.log(`Super admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
