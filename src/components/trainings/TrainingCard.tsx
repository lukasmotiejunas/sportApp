import { Link } from 'react-router-dom';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import type { CoachStaff, Member, TrainingSession } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { CapacityProgress } from './CapacityProgress';
import { ParticipantAvatarGroup } from './ParticipantAvatarGroup';
import { relativeDay } from '../../utils/dates';

type Props = {
  training: TrainingSession;
  coach?: CoachStaff;
  members: Member[]; // registered members
  isRegistered?: boolean;
  linkTo?: string;
  variant?: 'member' | 'coach';
};

const categoryStyles: Record<string, string> = {
  Sprint: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  Endurance: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Technique: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300',
  Recovery: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  Strength: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

export function TrainingCard({ training, coach, members, isRegistered, linkTo, variant = 'member' }: Props) {
  const spotsLeft = training.capacity - training.registrations.length;
  const isFull = spotsLeft <= 0;
  const isCancelled = training.status === 'cancelled';
  const isClosed = training.status === 'closed';

  return (
    <Link
      to={linkTo ?? '#'}
      className="group block surface p-4 transition-all hover:shadow-card hover:border-ink-300 dark:hover:border-ink-600"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-sm ${categoryStyles[training.category] ?? 'bg-ink-100 text-ink-700'}`}>
          {training.category.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {relativeDay(training.date)} · {training.startTime}
            </p>
            {isCancelled && <StatusBadge tone="danger" dot>Cancelled</StatusBadge>}
            {isClosed && !isCancelled && <StatusBadge tone="warning" dot>Closed</StatusBadge>}
            {isRegistered && !isCancelled && <StatusBadge tone="accent" dot>You&apos;re in</StatusBadge>}
          </div>
          <h3 className="mt-0.5 text-base font-semibold text-ink-900 dark:text-ink-50 group-hover:text-ink-950">
            {training.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {training.startTime}–{training.endTime}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {training.location}
            </span>
            {coach && <span className="text-ink-500">with {coach.name.replace('Coach ', '')}</span>}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-400 group-hover:text-ink-600" />
      </div>

      <div className="mt-3 grid grid-cols-[auto,1fr] items-center gap-3">
        <span
          className={`chip ${
            isFull ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200'
          }`}
        >
          {training.difficulty}
        </span>
        <CapacityProgress
          registered={training.registrations.length}
          capacity={training.capacity}
          showLabel={variant === 'member'}
        />
      </div>

      {members.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <ParticipantAvatarGroup members={members} max={6} size="xs" />
        </div>
      )}
    </Link>
  );
}
