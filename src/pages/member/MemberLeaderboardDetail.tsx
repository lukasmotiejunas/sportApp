import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Filter, Trophy, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore, useCurrentMember } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { LeaderboardRow } from '../../components/leaderboard/LeaderboardRow';
import { Podium } from '../../components/leaderboard/Podium';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';
import { formatResult } from '../../utils/format';
import { formatDateSlash } from '../../utils/dates';

export default function MemberLeaderboardDetail() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const member = useCurrentMember();
  const category = useStore((s) => s.leaderboardCategories.find((c) => c.id === id));
  const results = useStore((s) => s.leaderboardResults);
  const members = useStore((s) => s.members);
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [tab, setTab] = useState<'all' | 'mine'>('all');

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
    const list = Array.from(bestByMember.values());
    return list
      .map((r) => ({ result: r, member: members.find((m) => m.id === r.memberId)! }))
      .filter((x) => x.member)
      .filter((x) => (gender === 'all' ? true : x.member.gender === gender))
      .sort((a, b) => (category.lowerIsBetter ? a.result.value - b.result.value : b.result.value - a.result.value))
      .map((x, i) => ({ rank: i + 1, ...x }));
  }, [category, id, results, members, gender]);

  const myHistory = useMemo(() => {
    if (!category) return [];
    const mine = results
      .filter((r) => r.categoryId === id && r.memberId === member.id)
      .sort((a, b) => a.date.localeCompare(b.date)); // oldest → newest
    if (mine.length === 0) return [];
    const bestValue = mine.reduce(
      (acc, r) => (category.lowerIsBetter ? Math.min(acc, r.value) : Math.max(acc, r.value)),
      mine[0].value,
    );
    // annotate with trend vs previous chronological attempt, then reverse to newest-first
    return mine
      .map((r, i) => {
        const prev = i > 0 ? mine[i - 1] : null;
        const diff = prev ? r.value - prev.value : 0;
        const trend: 'up' | 'down' | 'flat' = !prev || diff === 0
          ? 'flat'
          : (category.lowerIsBetter ? diff < 0 : diff > 0)
            ? 'up'
            : 'down';
        return { r, trend, isBest: r.value === bestValue };
      })
      .reverse();
  }, [category, id, results, member.id]);

  if (!category) {
    return (
      <div>
        <PageTitle title={t('member_leaderboard_detail.not_found')} backTo="/member/leaderboards" />
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
        description={category.lowerIsBetter ? t('member_leaderboard_detail.desc_lower') : t('member_leaderboard_detail.desc_higher')}
        backTo="/member/leaderboards"
      />

      <div className="mb-4">
        <Tabs
          items={[
            { id: 'all', label: t('member_leaderboard_detail.tab_all') },
            { id: 'mine', label: t('member_leaderboard_detail.tab_mine'), badge: myHistory.length || undefined },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'all' | 'mine')}
          variant="underline"
        />
      </div>

      {tab === 'all' ? (
        <>
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
              {t('member_leaderboard_detail.filter_all')}
            </FilterChip>
            <FilterChip active={gender === 'male'} onClick={() => setGender('male')}>
              {t('member_leaderboard_detail.filter_male')}
            </FilterChip>
            <FilterChip active={gender === 'female'} onClick={() => setGender('female')}>
              {t('member_leaderboard_detail.filter_female')}
            </FilterChip>
          </div>

          {myRow && (
            <section className="mb-4 rounded-2xl border border-lime-300 bg-lime-50 p-3 dark:border-lime-500/50 dark:bg-lime-500/10">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-lime-900 dark:text-lime-200">{t('member_leaderboard_detail.my_rank')}</p>
              <LeaderboardRow
                rank={myRow.rank}
                result={myRow.result}
                member={myRow.member}
                category={category}
                movement={0}
                highlight
                formatDate={formatDateSlash}
              />
            </section>
          )}

          {ranked.length === 0 ? (
            <EmptyState icon={Filter} title={t('member_leaderboard_detail.empty_results')} description={t('member_leaderboard_detail.empty_results_desc')} />
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
                  formatDate={formatDateSlash}
                />
              ))}
            </div>
          )}
        </>
      ) : myHistory.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('member_leaderboard_detail.no_my_results')}
          description={t('member_leaderboard_detail.no_my_results_desc')}
        />
      ) : (
        <section className="surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              {t('member_leaderboard_detail.my_history')}
            </p>
            <p className="text-xs text-ink-500">
              {t('member_leaderboard_detail.total')} <span className="font-semibold text-ink-800 dark:text-ink-200">{myHistory.length}</span>
            </p>
          </div>
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {myHistory.map(({ r, trend, isBest }) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800/60">
                  {trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <Minus className="h-4 w-4 text-ink-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold tabular-nums">
                    {formatResult(r.value, category)}
                  </p>
                  {r.note && (
                    <p className="truncate text-xs text-ink-500">{r.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isBest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lime-700 dark:text-lime-300">
                      <Trophy className="h-3 w-3" /> {t('member_leaderboard_detail.record_badge')}
                    </span>
                  )}
                  <span className="text-xs text-ink-500">{formatDateSlash(r.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
