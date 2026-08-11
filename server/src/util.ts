import { prisma } from './prisma.js';

// Returns the admin email + club row for a given clubId, or null if not found.
// Used by notification-sending code across multiple route files.
export async function getClubAdminInfo(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      users: {
        where: { role: 'admin' },
        select: { email: true },
        take: 1,
      },
    },
  });
  if (!club || !club.users[0]) return null;
  return { club, adminEmail: club.users[0].email };
}

const AVATAR_COLORS = [
  'bg-orange-500',
  'bg-sky-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-teal-500',
];

export function initialsFromName(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
