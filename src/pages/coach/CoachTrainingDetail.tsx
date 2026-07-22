import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardEdit, Copy, DoorClosed, DoorOpen, Pencil, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CapacityProgress } from '../../components/trainings/CapacityProgress';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDateLong } from '../../utils/dates';

const paymentTone = {
  paid: 'success',
  overdue: 'danger',
} as const;

const paymentLabel = { paid: 'Apmokėta', overdue: 'Vėluoja' } as const;

const statusLabel = { open: 'Atvira', closed: 'Uždaryta', cancelled: 'Atšaukta' } as const;

export default function CoachTrainingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const training = useStore((s) => s.trainingSessions.find((t) => t.id === id));
  const members = useStore((s) => s.members);
  const coaches = useStore((s) => s.coaches);
  const plans = useStore((s) => s.trainingPlans);
  const setStatus = useStore((s) => s.setTrainingStatus);
  const duplicate = useStore((s) => s.duplicateTraining);
  const remove = useStore((s) => s.deleteTraining);
  const push = useStore((s) => s.pushToast);
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState(false);

  if (!training) {
    return (
      <div>
        <PageTitle title="Treniruotė nerasta" backTo="/coach/trainings" />
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
        title={training.title}
        description={`${formatDateLong(training.date)} · ${training.startTime}–${training.endTime}`}
        backTo="/coach/trainings"
        action={
          <div className="flex items-center gap-1">
            <Link to={`/coach/trainings/${training.id}/edit`} className="btn-outline">
              <Pencil className="h-4 w-4" /> Redaguoti
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                duplicate(training.id);
                push({ kind: 'success', message: 'Treniruotė nukopijuota.' });
              }}
            >
              <Copy className="h-4 w-4" /> Kopijuoti
            </button>
            <button type="button" className="btn-ghost text-red-600" onClick={() => setToDelete(true)}>
              <Trash2 className="h-4 w-4" /> Ištrinti
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Treneris</p>
          <p className="font-display text-lg font-bold">{coach?.name ?? 'Nenurodyta'}</p>
          <p className="text-xs text-ink-500">{coach?.specialty}</p>
          <hr className="my-3 border-ink-100 dark:border-ink-800" />
          <CapacityProgress registered={training.registrations.length} capacity={training.capacity} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={training.status === 'open' ? 'accent' : training.status === 'closed' ? 'warning' : 'danger'} dot>
              {statusLabel[training.status]}
            </StatusBadge>
            <button
              type="button"
              className="btn-ghost h-8 px-2 text-xs"
              onClick={() => {
                setStatus(training.id, training.status === 'open' ? 'closed' : 'open');
                push({ kind: 'info', message: `Registracija ${training.status === 'open' ? 'uždaryta' : 'atnaujinta'}.` });
              }}
            >
              {training.status === 'open' ? (
                <>
                  <DoorClosed className="h-3.5 w-3.5" /> Uždaryti registraciją
                </>
              ) : (
                <>
                  <DoorOpen className="h-3.5 w-3.5" /> Atnaujinti registraciją
                </>
              )}
            </button>
          </div>
        </section>

        <section className="surface p-4 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Treniruotės aprašymas</p>
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">{training.description}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Tikslai</p>
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
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Ką atsinešti</p>
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
            <h2 className="font-display text-lg font-bold">Dalyviai</h2>
            <p className="text-xs text-ink-500">
              Užsiregistravę {training.registrations.length} iš {training.capacity}.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="search"
              placeholder="Ieškoti dalyvių"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input h-10 pl-9 pr-3 w-56"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-500">
            {training.registrations.length === 0 ? 'Kol kas niekas neužsiregistravo.' : 'Atitikmenų nerasta.'}
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
                        {paymentLabel[row.m.paymentStatus]}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-ink-500">
                      Užsiregistravo {new Date(row.r.registeredAt).toLocaleDateString()} · {row.m.preferredDistance}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  {row.memberPlan?.status === 'published' ? (
                    <StatusBadge tone="accent" dot>Planas publikuotas</StatusBadge>
                  ) : row.memberPlan ? (
                    <StatusBadge tone="warning" dot>Juodraštis</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Nėra plano</StatusBadge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/coach/members/${row.m.id}`} className="btn-ghost h-9 px-3 text-xs">Profilis</Link>
                  <Link
                    to={`/coach/plans/${training.id}/${row.m.id}`}
                    className="btn-primary h-9 px-3 text-xs"
                  >
                    <ClipboardEdit className="h-3.5 w-3.5" />
                    {row.memberPlan ? 'Redaguoti planą' : 'Sukurti planą'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-lime-500" />
        Plano pakeitimai automatiškai išsaugomi prototipo būsenoje.
      </div>

      <ConfirmDialog
        open={toDelete}
        onClose={() => setToDelete(false)}
        onConfirm={() => {
          remove(training.id);
          push({ kind: 'info', message: 'Treniruotė ištrinta.' });
          navigate('/coach/trainings');
        }}
        title="Ištrinti šią treniruotę?"
        message="Užsiregistravę dalyviai neteks savo vietų. Prototipe šis veiksmas negali būti atšauktas."
        confirmLabel="Ištrinti treniruotę"
        destructive
      />
    </div>
  );
}
