import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore, useCurrentMember } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatResult } from "../../utils/format";

export default function MemberLeaderboards() {
  const { t } = useTranslation();
  const member = useCurrentMember();
  const categories = useStore((s) => s.leaderboardCategories);
  const results = useStore((s) => s.leaderboardResults);

  const [search, setSearch] = useState("");
  const active = categories.filter((c) => !c.archived);
  const filtered = active.filter((c) =>
    (c.name + c.event).toLowerCase().includes(search.toLowerCase()),
  );

  const rankedByCategory = useMemo(() => {
    const map: Record<string, { rank: number; value: number } | null> = {};
    for (const c of active) {
      const r = results
        .filter((x) => x.categoryId === c.id)
        .sort((a, b) =>
          c.lowerIsBetter ? a.value - b.value : b.value - a.value,
        );
      const idx = r.findIndex((x) => x.memberId === member.id);
      map[c.id] = idx >= 0 ? { rank: idx + 1, value: r[idx].value } : null;
    }
    return map;
  }, [active, results, member.id]);

  return (
    <div>
      <PageTitle
        title={t('member_leaderboards.title')}
        description={t('member_leaderboards.empty')}
        eyebrow={t('nav.results')}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input
          type="search"
          className="input pl-9"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('common.search')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => {
          const my = rankedByCategory[c.id];
          const top = results
            .filter((r) => r.categoryId === c.id)
            .sort((a, b) =>
              c.lowerIsBetter ? a.value - b.value : b.value - a.value,
            )[0];
          return (
            <Link
              key={c.id}
              to={`/member/leaderboards/${c.id}`}
              className="group surface flex items-center gap-3 p-4 hover:shadow-card"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {c.event}
                </p>
                <p className="font-display text-base font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {t('member_leaderboards.best')}: {top ? formatResult(top.value, c) : "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {my ? (
                  <StatusBadge tone="accent" dot>
                    #{my.rank} {formatResult(my.value, c)}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">{t('member_leaderboards.empty')}</StatusBadge>
                )}
                <ArrowRight className="h-4 w-4 text-ink-400" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
