import { useMemo, useState } from 'react';
import { Search, Users2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { MemberCard } from '../../components/members/MemberCard';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField } from '../../components/ui/FormField';

const paymentFilters = [
  { id: 'all', label: 'Visi' },
  { id: 'paid', label: 'Apmokėta' },
  { id: 'overdue', label: 'Vėluoja' },
] as const;

export default function CoachMembers() {
  const members = useStore((s) => s.members);
  const trainings = useStore((s) => s.trainingSessions);
  const results = useStore((s) => s.leaderboardResults);
  const categories = useStore((s) => s.leaderboardCategories);
  const plans = useStore((s) => s.membershipPlans);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof paymentFilters)[number]['id']>('all');
  const [sort, setSort] = useState<'name' | 'upcoming' | 'recent'>('name');

  const enriched = useMemo(() => {
    return members.map((m) => {
      const upcoming = trainings.filter(
        (t) =>
          t.date >= new Date().toISOString().slice(0, 10) &&
          t.registrations.some(
            (r) => r.memberId === m.id && r.status === 'registered',
          ),
      ).length;
      const lastAttended = trainings
        .filter(
          (t) =>
            t.date < new Date().toISOString().slice(0, 10) &&
            t.registrations.some(
              (r) => r.memberId === m.id && r.status === 'registered',
            ),
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const bestResult = results
        .filter((r) => r.memberId === m.id)
        .map((r) => ({ r, c: categories.find((c) => c.id === r.categoryId) }))
        .filter((x) => x.c && x.c.measurementType === 'seconds')
        .sort((a, b) => a.r.value - b.r.value)[0];
      return { m, upcoming, lastAttended, bestResult, plan: plans.find((p) => p.id === m.membershipPlanId) };
    });
  }, [members, trainings, results, categories, plans]);

  const filtered = enriched
    .filter(({ m }) =>
      (filter === 'all' ? true : m.paymentStatus === filter) &&
      m.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === 'name') return a.m.name.localeCompare(b.m.name);
      if (sort === 'upcoming') return b.upcoming - a.upcoming;
      return (b.lastAttended?.date ?? '').localeCompare(a.lastAttended?.date ?? '');
    });

  return (
    <div>
      <PageTitle
        eyebrow="Treneris"
        title="Nariai"
        description={`Iš viso klubo narių: ${members.length}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Ieškoti narių"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Ieškoti narių"
          />
        </div>
        <SelectField value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Rikiuoti" className="w-40 shrink-0">
          <option value="name">Rikiuoti pagal vardą</option>
          <option value="upcoming">Artėjančios registracijos</option>
          <option value="recent">Ankstesnės treniruotės</option>
        </SelectField>
      </div>

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {paymentFilters.map((f) => (
          <FilterChip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users2} title="Nė vienas narys neatitinka paieškos" description="Pabandykite išvalyti filtrus arba įvesti kitą vardą." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map(({ m }) => (
            <MemberCard
              key={m.id}
              member={m}
              to={`/coach/members/${m.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
