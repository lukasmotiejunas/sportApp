import clsx from 'clsx';
import { Crown, Medal } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { LeaderboardCategory, LeaderboardResult, Member } from '../../types';
import { formatResult } from '../../utils/format';

type Entry = { result: LeaderboardResult; member: Member };

type Props = {
  entries: Entry[]; // top-3 ordered
  category: LeaderboardCategory;
};

export function Podium({ entries, category }: Props) {
  if (entries.length === 0) return null;
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-3xl bg-gradient-to-b from-ink-950 to-ink-800 p-4 text-white">
      <PodiumStep place={2} entry={second} category={category} height="h-24" tone="bg-slate-500" />
      <PodiumStep place={1} entry={first} category={category} height="h-32" tone="bg-lime-400 text-ink-950" isTop />
      <PodiumStep place={3} entry={third} category={category} height="h-20" tone="bg-amber-600" />
    </div>
  );
}

function PodiumStep({
  place,
  entry,
  category,
  height,
  tone,
  isTop,
}: {
  place: number;
  entry?: Entry;
  category: LeaderboardCategory;
  height: string;
  tone: string;
  isTop?: boolean;
}) {
  if (!entry) {
    return (
      <div className="flex flex-col items-center">
        <div className="my-3 text-xs text-ink-400">—</div>
        <div className={clsx('w-full rounded-t-xl bg-ink-800', height)} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-2">
        {isTop ? (
          <Crown className="mx-auto h-4 w-4 text-lime-300" />
        ) : (
          <Medal className="mx-auto h-4 w-4 text-white/70" />
        )}
      </div>
      <Avatar
        name={entry.member.name}
        color={entry.member.avatarColor}
        size="md"
        ring
        photoUrl={entry.member.photoUrl}
      />
      <p className="mt-1.5 truncate max-w-full text-xs font-semibold text-white">{entry.member.name}</p>
      <p className="font-display text-base font-bold tabular-nums">{formatResult(entry.result.value, category)}</p>
      <div
        className={clsx(
          'mt-2 w-full rounded-t-2xl font-display font-bold grid place-items-center',
          height,
          tone,
        )}
      >
        <span className="text-2xl">{place}</span>
      </div>
    </div>
  );
}
