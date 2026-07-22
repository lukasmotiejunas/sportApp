import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { useStore, useCurrentMember } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { LeaderboardRow } from '../../components/leaderboard/LeaderboardRow';
import { Podium } from '../../components/leaderboard/Podium';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';

export default function MemberLeaderboardDetail() {
  const { id = '' } = useParams();
  const member = useCurrentMember();
  const category = useStore((s) => s.leaderboardCategories.find((c) => c.id === id));
  const results = useStore((s) => s.leaderboardResults);
  const members = useStore((s) => s.members);
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [range, setRange] = useState<'all' | 'month'>('all');

  const ranked = useMemo(() => {
    if (!category) return [] as { rank: number; result: (typeof results)[number]; member: (typeof members)[number] }[];
    // best-per-member
    const bestByMember = new Map<string, (typeof results)[number]>();
    for (const r of results) {
      if (r.categoryId !== id) continue;
      const current = bestByMember.get(r.memberId);
      if (!current || (category.lowerIsBetter ? r.value < current.value : r.value > current.value)) {
        bestByMember.set(r.memberId, r);
      }
    }
    let list = Array.from(bestByMember.values());
    if (range === 'month') {
      const t = new Date();
      list = list.filter((r) => new Date(r.date + 'T00:00:00').getMonth() === t.getMonth());
    }
    return list
      .map((r) => ({ result: r, member: members.find((m) => m.id === r.memberId)! }))
      .filter((x) => x.member)
      .filter((x) => (gender === 'all' ? true : x.member.gender === gender))
      .sort((a, b) => (category.lowerIsBetter ? a.result.value - b.result.value : b.result.value - a.result.value))
      .map((x, i) => ({ rank: i + 1, ...x }));
  }, [category, id, results, members, gender, range]);

  if (!category) {
    return (
      <div>
        <PageTitle title="Rezultatų lentelė nerasta" backTo="/member/leaderboards" />
      </div>
    );
  }

  const topThree = ranked.slice(0, 3);
  const myRow = ranked.find((r) => r.member.id === member.id);

  return (
    <div>
      <PageTitle
        title={category.name}
        eyebrow={category.event}
        description={category.lowerIsBetter ? 'Laimi greičiausias rezultatas.' : 'Laimi didžiausia reikšmė.'}
        backTo="/member/leaderboards"
      />

      {topThree.length > 0 && (
        <div className="mb-4">
          <Podium
            entries={topThree.map((x) => ({ result: x.result, member: x.member }))}
            category={category}
          />
        </div>
      )}

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        <FilterChip icon={<Filter className="h-3.5 w-3.5" />} active={gender === 'all'} onClick={() => setGender('all')}>
          Visi nariai
        </FilterChip>
        <FilterChip active={gender === 'male'} onClick={() => setGender('male')}>
          Vyrai
        </FilterChip>
        <FilterChip active={gender === 'female'} onClick={() => setGender('female')}>
          Moterys
        </FilterChip>
        <FilterChip active={range === 'all'} onClick={() => setRange('all')}>
          Visą laiką
        </FilterChip>
        <FilterChip active={range === 'month'} onClick={() => setRange('month')}>
          Šį mėnesį
        </FilterChip>
      </div>

      {myRow && (
        <section className="mb-4 rounded-2xl border border-lime-300 bg-lime-50 p-3 dark:border-lime-500/50 dark:bg-lime-500/10">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-lime-900 dark:text-lime-200">Jūsų vieta</p>
          <LeaderboardRow
            rank={myRow.rank}
            result={myRow.result}
            member={myRow.member}
            category={category}
            movement={0}
            highlight
          />
        </section>
      )}

      {ranked.length === 0 ? (
        <EmptyState icon={Filter} title="Reitinguotų rezultatų dar nėra" description="Paprašykite trenerio įtraukti rezultatus." />
      ) : (
        <div className="space-y-2">
          {ranked.map((row) => (
            <LeaderboardRow
              key={row.result.id}
              rank={row.rank}
              result={row.result}
              member={row.member}
              category={category}
              highlight={row.member.id === member.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
