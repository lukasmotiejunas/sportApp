import clsx from 'clsx';
import { ArrowDown, ArrowUp, Minus, Star } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { LeaderboardCategory, LeaderboardResult, Member } from '../../types';
import { formatResult } from '../../utils/format';
import { formatDateShort } from '../../utils/dates';

type Props = {
  rank: number;
  result: LeaderboardResult;
  member: Member;
  category: LeaderboardCategory;
  movement?: number; // positive = moved up in ranking
  highlight?: boolean;
};

export function LeaderboardRow({ rank, result, member, category, movement, highlight }: Props) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
        highlight
          ? 'border-lime-400 bg-lime-50 dark:border-lime-500/50 dark:bg-lime-500/10'
          : 'border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900',
      )}
    >
      <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-sm font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-100">
        {rank}
      </div>
      <Avatar name={member.name} color={member.avatarColor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{member.name}</p>
          {result.personalBest && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-lime-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-lime-900 dark:bg-lime-400/20 dark:text-lime-200">
              <Star className="h-2.5 w-2.5" /> PB
            </span>
          )}
        </div>
        <p className="text-xs text-ink-500">
          {formatDateShort(result.date)} · {member.ageGroup}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-base font-bold text-ink-900 dark:text-ink-50 tabular-nums">
          {formatResult(result.value, category)}
        </p>
        {movement !== undefined && movement !== 0 && (
          <p
            className={clsx(
              'flex items-center justify-end gap-0.5 text-[11px] font-semibold',
              movement > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
            )}
          >
            {movement > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(movement)}
          </p>
        )}
        {movement === 0 && (
          <p className="flex items-center justify-end gap-0.5 text-[11px] font-semibold text-ink-400">
            <Minus className="h-3 w-3" /> —
          </p>
        )}
      </div>
    </div>
  );
}
