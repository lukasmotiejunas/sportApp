import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from 'react-joyride';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDateSlash, todayIso, relativeDay } from '../../utils/dates';
import { useTrainingsBase } from '../../utils/roleContext';

const timeFilters = [
  { id: 'upcoming', label: 'Artėjančios' },
  { id: 'today', label: 'Šiandien' },
  { id: 'past', label: 'Ankstesnės' },
  { id: 'all', label: 'Visos' },
] as const;

const statusLabel = { open: 'Atvira', closed: 'Uždaryta', cancelled: 'Atšaukta' } as const;

export default function CoachTrainings() {
  const { base, eyebrow, isAdmin } = useTrainingsBase();
  const trainings = useStore((s) => s.trainingSessions);
  const coaches = useStore((s) => s.coaches);
  const duplicate = useStore((s) => s.duplicateTraining);
  const remove = useStore((s) => s.deleteTraining);
  const push = useStore((s) => s.pushToast);
  const authUserId = useStore((s) => s.authUser?.id ?? '');
  const [time, setTime] = useState<(typeof timeFilters)[number]['id']>('upcoming');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [runTour, setRunTour] = useState(false);
  const today = todayIso();

  const filtered = useMemo(() => {
    return trainings
      .filter((t) => {
        if (time === 'all') return true;
        if (time === 'past') return t.date < today;
        if (time === 'today') return t.date === today;
        return t.date >= today;
      })
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [trainings, time, today]);

  const tourEnabled = !isAdmin;
  const tourStorageKey = `coach_trainings_tour_seen:${authUserId || 'anon'}`;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        'Treniruotės — čia matote visų klubo treniruočių sąrašą ir galite jas valdyti: kurti naujas, redaguoti, kopijuoti pasikartojančias arba peržiūrėti dalyvių sąrašą.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="create"]',
      content:
        'Naujos treniruotės kūrimas. Paspauskite čia, kad sukurtumėte naują treniruotę — galėsite užpildyti laukus rankiniu būdu arba pasirinkti anksčiau sukurtą planą, ir laukai užsipildys automatiškai.',
    },
    {
      target: '[data-tour="filters"]',
      content:
        'Laiko filtrai. „Artėjančios“ — būsimos treniruotės (pagal nutylėjimą). „Šiandien“ — tik šios dienos. „Ankstesnės“ — jau įvykusios. „Visos“ — pilna istorija.',
    },
    {
      target: '[data-tour="list"]',
      content:
        'Treniruočių sąrašas. Kiekvienoje eilutėje — pavadinimas, priskirtas treneris, data ir laikas, talpa (užsiregistravę / bendra) ir būsena (Atvira / Uždaryta / Atšaukta). Talpos spalva parodo užpildymą: žalia — laisva, geltona — beveik pilna, raudona — pilna.',
      placement: 'top',
    },
    {
      target: '[data-tour="actions"]',
      content:
        'Veiksmai. „Atidaryti“ — pereiti į treniruotės detales su dalyvių sąrašu ir individualiais planais. Pieštukas — redaguoti. Kopijos ikona — sukurti identišką treniruotę (patogu pasikartojančioms). Šiukšlinė — ištrinti (užsiregistravę nariai neteks vietos).',
      placement: 'left',
    },
  ];

  useEffect(() => {
    if (!tourEnabled) return;
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourEnabled]);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, '1');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div>
      {tourEnabled && (
        <Joyride
          steps={tourSteps}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          disableScrolling={false}
          callback={handleTourCallback}
          locale={{
            back: 'Atgal',
            close: 'Uždaryti',
            last: 'Baigti',
            next: 'Toliau',
            skip: 'Praleisti',
          }}
          styles={{
            options: {
              primaryColor: '#5da004',
              zIndex: 10000,
            },
          }}
        />
      )}
      <div data-tour="page-title">
        <PageTitle
          title="Treniruotės"
          description="Valdykite visas klubo treniruotes — kurkite, redaguokite, kopijuokite ir peržiūrėkite dalyvių sąrašą."
          eyebrow={eyebrow}
          action={
            <Link to={`${base}/new`} className="btn-primary" data-tour="create">
              <Plus className="h-4 w-4" /> Sukurti treniruotę
            </Link>
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" data-tour="filters">
        {timeFilters.map((tf) => (
          <FilterChip key={tf.id} active={time === tf.id} onClick={() => setTime(tf.id)}>
            {tf.label}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nė viena treniruotė neatitinka filtrų"
          description="Pabandykite išplėsti laikotarpį."
          action={
            <Link to={`${base}/new`} className="btn-primary">
              <Plus className="h-4 w-4" /> Sukurti treniruotę
            </Link>
          }
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-ink-100 dark:border-ink-800"
          data-tour="list"
        >
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
              <tr>
                <th className="px-4 py-2 font-semibold">Treniruotė</th>
                <th className="px-4 py-2 font-semibold">Treneris</th>
                <th className="px-4 py-2 font-semibold">Data</th>
                <th className="px-4 py-2 font-semibold">Talpa</th>
                <th className="px-4 py-2 font-semibold">Būsena</th>
                <th className="px-4 py-2 text-right font-semibold">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {filtered.map((t) => {
                const coach = coaches.find((c) => c.id === t.coachId);
                const activeCount = t.registrations.filter((r) => r.status === 'registered').length;
                const pct = Math.round((activeCount / t.capacity) * 100);
                return (
                  <tr key={t.id} className="bg-white hover:bg-ink-50 dark:bg-ink-900 dark:hover:bg-ink-800/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900 dark:text-ink-50">{t.title}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{coach?.name.replace('Coach ', '') ?? 'Nenurodyta'}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                      <div>{formatDateSlash(t.date)}</div>
                      <div className="text-xs">{t.startTime}–{t.endTime}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'success'}>
                        {activeCount}/{t.capacity}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={t.status === 'open' ? 'accent' : t.status === 'closed' ? 'warning' : 'danger'}
                        dot
                      >
                        {statusLabel[t.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        data-tour="actions"
                      >
                        <Link to={`${base}/${t.id}`} className="btn-ghost h-8 px-2 text-xs">Atidaryti</Link>
                        <Link to={`${base}/${t.id}/edit`} className="btn-ghost h-8 px-2 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          className="btn-ghost h-8 px-2 text-xs"
                          onClick={() => {
                            duplicate(t.id);
                            push({ kind: 'success', message: 'Treniruotė nukopijuota.' });
                          }}
                          aria-label="Kopijuoti"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost h-8 px-2 text-xs text-red-600"
                          onClick={() => setToDelete(t.id)}
                          aria-label="Ištrinti"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul className="divide-y divide-ink-100 md:hidden dark:divide-ink-800">
            {filtered.map((t) => {
              const coach = coaches.find((c) => c.id === t.coachId);
              const pct = Math.round((t.registrations.length / t.capacity) * 100);
              return (
                <li key={t.id} className="bg-white p-4 dark:bg-ink-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {relativeDay(t.date)} · {t.startTime}
                      </p>
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="text-xs text-ink-500">
                        {coach?.name.replace('Coach ', '') ?? 'Nenurodyta'}
                      </p>
                    </div>
                    <StatusBadge tone={pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'success'}>
                      {t.registrations.length}/{t.capacity}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <Link to={`${base}/${t.id}`} className="btn-ghost h-8 px-2 text-xs">Atidaryti</Link>
                    <Link to={`${base}/${t.id}/edit`} className="btn-ghost h-8 px-2 text-xs">
                      <Pencil className="h-3.5 w-3.5" /> Redaguoti
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost h-8 px-2 text-xs"
                      onClick={() => {
                        duplicate(t.id);
                        push({ kind: 'success', message: 'Treniruotė nukopijuota.' });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Kopijuoti
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-8 px-2 text-xs text-red-600"
                      onClick={() => setToDelete(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Ištrinti
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            remove(toDelete);
            push({ kind: 'info', message: 'Treniruotė ištrinta.' });
          }
        }}
        title="Ištrinti treniruotę?"
        message="Bus pašalinta treniruotė ir jos registracijos. Užsiregistravę nariai neteks savo vietos."
        confirmLabel="Ištrinti"
        destructive
      />
    </div>
  );
}
