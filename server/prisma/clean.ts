import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Removes ALL domain/test data from the database while KEEPING admin login
// accounts, so you can start from an empty app but still sign in.
//
// Targets whatever DATABASE_URL points to in server/.env (currently Neon).
// Run with: npm run db:clean
const prisma = new PrismaClient();

async function main() {
  // Delete children before parents to respect foreign keys.
  await prisma.leaderboardResult.deleteMany();
  await prisma.leaderboardCategory.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.trainingRegistration.deleteMany();
  await prisma.trainingSession.deleteMany(); // must precede Coach (FK is Restrict)
  // Deleting members/coaches cascades to their linked (non-admin) User rows.
  await prisma.member.deleteMany();
  await prisma.coach.deleteMany();
  await prisma.membershipPlan.deleteMany();
  // Safety net: drop any remaining non-admin users.
  await prisma.user.deleteMany({ where: { role: { not: 'admin' } } });

  const remainingAdmins = await prisma.user.count({ where: { role: 'admin' } });
  console.log(`Cleaned all test data. Admin accounts kept: ${remainingAdmins}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
