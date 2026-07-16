import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Clock,
  Info,
  MapPin,
  Package,
  Sparkles,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useStore, useCurrentMember } from '../../store/useStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CapacityProgress } from '../../components/trainings/CapacityProgress';
import { PageTitle } from '../../components/layout/PageTitle';
import { formatDateLong, relativeDay } from '../../utils/dates';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Avatar } from '../../components/ui/Avatar';

export default function MemberTrainingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const member = useCurrentMember();
  const training = useStore((s) => s.trainingSessions.find((t) => t.id === id));
  const coaches = useStore((s) => s.coaches);
  const members = useStore((s) => s.members);
  const register = useStore((s) => s.registerForTraining);
  const cancel = useStore((s) => s.cancelRegistration);
  const push = useStore((s) => s.pushToast);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const coach = useMemo(() => coaches.find((c) => c.id === training?.coachId), [coaches, training]);
  if (!training) {
    return (
      <div>
        <PageTitle title="Training not found" backTo="/member/trainings" />
      </div>
    );
  }

  const registered = training.registrations
    .map((r) => members.find((m) => m.id === r.memberId))
    .filter(Boolean) as typeof members;
  const isRegistered = training.registrations.some((r) => r.memberId === member.id);
  const isFull = training.registrations.length >= training.capacity;
  const isOverdue = member.paymentStatus === 'overdue';
  const isCancelled = training.status === 'cancelled';
  const isClosed = training.status === 'closed';

  const doRegister = () => {
    const res = register(training.id, member.id);
    if (res.ok) {
      push({ kind: 'success', message: 'You’re in — training registration completed.' });
    } else {
      push({ kind: 'error', message: res.error ?? 'Could not register.' });
    }
  };

  const doCancel = () => {
    cancel(training.id, member.id);
    push({ kind: 'info', message: 'Registration cancelled — a spot has been released.' });
  };

  const primary = () => {
    if (isRegistered) {
      return (
        <button className="btn-danger flex-1" onClick={() => setConfirmCancel(true)}>
          <XCircle className="h-4 w-4" /> Cancel my registration
        </button>
      );
    }
    if (isCancelled) return <button className="btn-outline flex-1" disabled>Session cancelled</button>;
    if (isClosed) return <button className="btn-outline flex-1" disabled>Registration closed</button>;
    if (isOverdue)
      return (
        <button
          className="btn-danger flex-1"
          onClick={() => navigate('/member/payments')}
        >
          Pay to unlock registration
        </button>
      );
    if (isFull) {
      return (
        <button className="btn-outline flex-1" disabled>
          Full · join waiting list (prototype)
        </button>
      );
    }
    return (
      <button className="btn-accent flex-1" onClick={doRegister}>
        Register for this session
      </button>
    );
  };

  return (
    <div>
      <PageTitle
        title={training.title}
        eyebrow={`${relativeDay(training.date)} · ${training.startTime}`}
        backTo="/member/trainings"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="chip bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">{training.category}</span>
            <span className="chip bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">{training.difficulty}</span>
            {isRegistered && <StatusBadge tone="accent" dot>You&apos;re registered</StatusBadge>}
            {isCancelled && <StatusBadge tone="danger" dot>Cancelled</StatusBadge>}
            {isFull && !isRegistered && !isCancelled && <StatusBadge tone="danger" dot>Session full</StatusBadge>}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">{training.description}</p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <InfoRow icon={Clock} label="Time" value={`${training.startTime}–${training.endTime}`} />
            <InfoRow icon={MapPin} label="Location" value={training.location} />
            <InfoRow icon={UserRound} label="Coach" value={coach?.name ?? 'TBA'} />
            <InfoRow icon={Info} label="Date" value={formatDateLong(training.date)} />
          </div>

          <div className="mt-4">
            <CapacityProgress registered={training.registrations.length} capacity={training.capacity} />
          </div>
        </section>

        <section className="surface p-4">
          <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
            <Target className="h-4 w-4 text-lime-600" /> Session goals
          </h3>
          <ul className="space-y-1.5 text-sm text-ink-700 dark:text-ink-200">
            {training.goals.map((g) => (
              <li key={g} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                {g}
              </li>
            ))}
          </ul>

          <h3 className="mt-4 mb-2 flex items-center gap-2 font-display text-base font-bold">
            <Package className="h-4 w-4 text-sky-500" /> What to bring
          </h3>
          <ul className="space-y-1.5 text-sm text-ink-700 dark:text-ink-200">
            {training.whatToBring.map((g) => (
              <li key={g} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                {g}
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-4 md:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Sparkles className="h-4 w-4 text-lime-600" />
            Registered participants
            <span className="text-xs font-medium text-ink-500">
              · {registered.length} of {training.capacity}
            </span>
          </h3>
          {registered.length === 0 ? (
            <p className="text-sm text-ink-500">Be the first to register for this session.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {registered.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-xl border border-ink-100 p-2 dark:border-ink-800">
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-[11px] text-ink-500">{m.preferredDistance}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sticky action */}
      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-4xl px-4 pb-2 md:static md:mt-4 md:px-0">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-100 bg-white/95 p-2 shadow-pop backdrop-blur md:border-transparent md:bg-transparent md:p-0 md:shadow-none dark:border-ink-800 dark:bg-ink-950/95 md:dark:bg-transparent">
          <Link to="/member/plan" className="btn-ghost hidden sm:inline-flex">
            View my plan
          </Link>
          {primary()}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Cancel this registration?"
        message="Your spot will be released to another club member. You can register again later while spots are available."
        confirmLabel="Cancel registration"
        cancelLabel="Keep me in"
        destructive
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800/60">
      <Icon className="h-4 w-4 text-ink-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{value}</p>
      </div>
    </div>
  );
}
