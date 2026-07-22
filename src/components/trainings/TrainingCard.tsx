import { Link } from 'react-router-dom';
import { Activity, Clock, MapPin, ChevronRight } from 'lucide-react';
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

export function TrainingCard({ training, coach, members, isRegistered, linkTo, variant = 'member' }: Props) {
  const isCancelled = training.status === 'cancelled';
  const isClosed = training.status === 'closed';

  return (
    <Link
      to={linkTo ?? '#'}
      className="group block surface p-4 transition-all hover:shadow-card hover:border-ink-300 dark:hover:border-ink-600"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {relativeDay(training.date)} · {training.startTime}
            </p>
            {isCancelled && <StatusBadge tone="danger" dot>Atšaukta</StatusBadge>}
            {isClosed && !isCancelled && <StatusBadge tone="warning" dot>Uždaryta</StatusBadge>}
            {isRegistered && !isCancelled && <StatusBadge tone="accent" dot>Užsiregistravote</StatusBadge>}
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
            {coach && <span className="text-ink-500">su {coach.name.replace('Coach ', '')}</span>}
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-400 group-hover:text-ink-600" />
      </div>

      <div className="mt-3">
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
