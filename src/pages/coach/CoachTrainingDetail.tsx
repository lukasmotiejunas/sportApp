import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardEdit, Copy, DoorClosed, DoorOpen, Pencil, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CapacityProgress } from '../../components/trainings/CapacityProgress';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SelectField } from '../../components/ui/FormField';
import { formatDateLong } from '../../utils/dates';
import type { AttendanceStatus } from '../../types';

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  unmarked: 'Unmarked',
};

const paymentTone = {
  paid: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  processing: 'info',
} as const;

export default function CoachTrainingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const training = useStore((s) => s.trainingSessions.find((t) => t.id === id));
  const members = useStore((s) => s.members);
  const coaches = useStore((s) => s.coaches);
  const plans = useStore((s) => s.trainingPlans);
  const setStatus = useStore((s) => s.setTrainingStatus);
  const setAttendance = useStore((s) => s.markAttendance);
  const duplicate = useStore((s) => s.duplicateTraining);
  const remove = useStore((s) => s.deleteTraining);
  const push = useStore((s) => s.pushToast);
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState(false);

  if (!training) {
    return (
      <div>
        <PageTitle title="Training not found" backTo="/coach/trainings" />
      </div>
    );
  }
  const coach = coaches.find((c) => c.id === training.coachId);

  const rows = training.registrations
    .map((r) => {
      const m = members.find((x) => x.id === r.memberId);
      if (!m) return null;
      const memberPlan = plans.find(
        (p) => p.trainingSessionId === training.id && p.memberId === m.id,
      );
      return { r, m, memberPlan };
    })
    .filter(Boolean) as { r: (typeof training.registrations)[number]; m: (typeof members)[number]; memberPlan?: (typeof plans)[number] }[];

  const filtered = rows.filter((row) =>
    row.m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageTitle
        eyebrow={`${training.category} · ${training.difficulty}`}
        title={training.title}
        description={`${formatDateLong(training.date)} · ${training.startTime}–${training.endTime}`}
        backTo="/coach/trainings"
        action={
          <div className="flex items-center gap-1">
            <Link to={`/coach/trainings/${training.id}/edit`} className="btn-outline">
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                duplicate(training.id);
                push({ kind: 'success', message: 'Session duplicated.' });
              }}
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button type="button" className="btn-ghost text-red-600" onClick={() => setToDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Coach</p>
          <p className="font-display text-lg font-bold">{coach?.name ?? 'TBA'}</p>
          <p className="text-xs text-ink-500">{coach?.specialty}</p>
          <hr className="my-3 border-ink-100 dark:border-ink-800" />
          <CapacityProgress registered={training.registrations.length} capacity={training.capacity} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={training.status === 'open' ? 'accent' : training.status === 'closed' ? 'warning' : 'danger'} dot>
              {training.status}
            </StatusBadge>
            <button
              type="button"
              className="btn-ghost h-8 px-2 text-xs"
              onClick={() => {
                setStatus(training.id, training.status === 'open' ? 'closed' : 'open');
                push({ kind: 'info', message: `Registration ${training.status === 'open' ? 'closed' : 'reopened'}.` });
              }}
            >
              {training.status === 'open' ? (
                <>
                  <DoorClosed className="h-3.5 w-3.5" /> Close registration
                </>
              ) : (
                <>
                  <DoorOpen className="h-3.5 w-3.5" /> Reopen registration
                </>
              )}
            </button>
          </div>
        </section>

        <section className="surface p-4 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Session brief</p>
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{training.description}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Goals</p>
              <ul className="space-y-1 text-sm">
                {training.goals.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-ink-700 dark:text-ink-200">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">What to bring</p>
              <ul className="space-y-1 text-sm">
                {training.whatToBring.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-ink-700 dark:text-ink-200">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="surface mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 p-4 dark:border-ink-800">
          <div>
            <h2 className="font-display text-lg font-bold">Participants</h2>
            <p className="text-xs text-ink-500">
              {training.registrations.length} of {training.capacity} · attendance can be marked live.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="search"
              placeholder="Search participants"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input h-10 pl-9 pr-3 w-56"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-500">
            {training.registrations.length === 0 ? 'Nobody has registered yet.' : 'No match found.'}
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map((row) => (
              <li key={row.m.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 min-w-0 items-center gap-3">
                  <Avatar name={row.m.name} color={row.m.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{row.m.name}</p>
                      <StatusBadge tone={paymentTone[row.m.paymentStatus]} dot>
                        {row.m.paymentStatus.replace('_', ' ')}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-ink-500">
                      Registered {new Date(row.r.registeredAt).toLocaleDateString()} · {row.m.preferredDistance}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:w-72 sm:shrink-0">
                  <SelectField
                    aria-label={`Attendance for ${row.m.name}`}
                    value={row.r.attendance}
                    onChange={(e) => setAttendance(training.id, row.m.id, e.target.value as AttendanceStatus)}
                    className="flex-1"
                  >
                    {(['unmarked', 'present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((a) => (
                      <option key={a} value={a}>{attendanceLabels[a]}</option>
                    ))}
                  </SelectField>
                  {row.memberPlan?.status === 'published' ? (
                    <StatusBadge tone="accent" dot>Plan published</StatusBadge>
                  ) : row.memberPlan ? (
                    <StatusBadge tone="warning" dot>Draft</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">No plan</StatusBadge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/coach/members/${row.m.id}`} className="btn-ghost h-9 px-3 text-xs">Profile</Link>
                  <Link
                    to={`/coach/plans/${training.id}/${row.m.id}`}
                    className="btn-primary h-9 px-3 text-xs"
                  >
                    <ClipboardEdit className="h-3.5 w-3.5" />
                    {row.memberPlan ? 'Edit plan' : 'Create plan'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-lime-500" />
        Attendance and plan changes save automatically to prototype state.
      </div>

      <ConfirmDialog
        open={toDelete}
        onClose={() => setToDelete(false)}
        onConfirm={() => {
          remove(training.id);
          push({ kind: 'info', message: 'Training deleted.' });
          navigate('/coach/trainings');
        }}
        title="Delete this training?"
        message="Registered participants will lose their spots. This cannot be undone in the prototype."
        confirmLabel="Delete session"
        destructive
      />
    </div>
  );
}
