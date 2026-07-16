import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ChevronRight, Plus, Trophy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FormField, SelectField } from '../../components/ui/FormField';
import type { LeaderboardCategory } from '../../types';
import { formatResult } from '../../utils/format';

export default function CoachLeaderboards() {
  const categories = useStore((s) => s.leaderboardCategories);
  const results = useStore((s) => s.leaderboardResults);
  const addCategory = useStore((s) => s.addLeaderboardCategory);
  const archive = useStore((s) => s.archiveLeaderboardCategory);
  const push = useStore((s) => s.pushToast);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<LeaderboardCategory, 'id'>>({
    name: '',
    event: '',
    measurementType: 'seconds',
    unit: 's',
    lowerIsBetter: true,
    genderCategory: 'all',
    ageCategory: 'All',
    archived: false,
  });

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  const create = () => {
    if (!draft.name.trim() || !draft.event.trim()) return;
    addCategory(draft);
    push({ kind: 'success', message: 'Leaderboard category created.' });
    setOpen(false);
    setDraft({
      name: '',
      event: '',
      measurementType: 'seconds',
      unit: 's',
      lowerIsBetter: true,
      genderCategory: 'all',
      ageCategory: 'All',
      archived: false,
    });
  };

  return (
    <div>
      <PageTitle
        eyebrow="Coach"
        title="Leaderboards"
        description="Create categories and manage official results."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New leaderboard
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((c) => {
          const total = results.filter((r) => r.categoryId === c.id).length;
          const top = results
            .filter((r) => r.categoryId === c.id)
            .sort((a, b) => (c.lowerIsBetter ? a.value - b.value : b.value - a.value))[0];
          return (
            <Link key={c.id} to={`/coach/leaderboards/${c.id}`} className="group surface flex flex-col p-4 hover:shadow-card">
              <div className="mb-2 flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.event}</p>
                  <p className="font-display text-base font-bold">{c.name}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-ink-400 group-hover:text-ink-600" />
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
                <span>{total} results</span>
                <span className="font-semibold">Top {top ? formatResult(top.value, c) : '—'}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusBadge tone="neutral">{c.genderCategory === 'all' ? 'All members' : c.genderCategory}</StatusBadge>
                <StatusBadge tone="neutral">{c.ageCategory}</StatusBadge>
                <StatusBadge tone="info">{c.lowerIsBetter ? 'Lower is better' : 'Higher is better'}</StatusBadge>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  archive(c.id);
                  push({ kind: 'info', message: 'Leaderboard archived.' });
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
              >
                <Archive className="h-3 w-3" /> Archive
              </button>
            </Link>
          );
        })}
      </div>

      {archived.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Archived</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <div key={c.id} className="surface flex items-center justify-between p-3 opacity-70">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.event}</p>
                  <p className="text-sm font-semibold">{c.name}</p>
                </div>
                <StatusBadge tone="neutral">Archived</StatusBadge>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create leaderboard category"
        description="Categories can be tied to events, gender, and age groups."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}>Create category</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <FormField label="Event" required placeholder="e.g. 100 m" value={draft.event} onChange={(e) => setDraft({ ...draft, event: e.target.value })} />
          <SelectField label="Measurement type" value={draft.measurementType} onChange={(e) => {
            const v = e.target.value as LeaderboardCategory['measurementType'];
            const unit =
              v === 'seconds' ? 's' :
              v === 'ms' ? 'ms' :
              v === 'distance_km' ? 'km' :
              v === 'points' ? 'pts' : 'sessions';
            setDraft({ ...draft, measurementType: v, unit, lowerIsBetter: v === 'seconds' || v === 'ms' });
          }}>
            <option value="seconds">Seconds</option>
            <option value="ms">Milliseconds</option>
            <option value="distance_km">Distance (km)</option>
            <option value="points">Points</option>
            <option value="attendance">Attendance count</option>
          </SelectField>
          <SelectField label="Direction" value={draft.lowerIsBetter ? 'lower' : 'higher'} onChange={(e) => setDraft({ ...draft, lowerIsBetter: e.target.value === 'lower' })}>
            <option value="lower">Lower is better</option>
            <option value="higher">Higher is better</option>
          </SelectField>
          <SelectField label="Gender category" value={draft.genderCategory} onChange={(e) => setDraft({ ...draft, genderCategory: e.target.value as any })}>
            <option value="all">All</option>
            <option value="male">Men</option>
            <option value="female">Women</option>
          </SelectField>
          <FormField label="Age category" value={draft.ageCategory} onChange={(e) => setDraft({ ...draft, ageCategory: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
