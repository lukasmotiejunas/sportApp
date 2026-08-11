import { Link, useParams } from "react-router-dom";
import {
  CalendarCheck2,
  CreditCard,
  Mail,
  Phone,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateSlash, todayIso } from "../../utils/dates";
import { formatCurrency, formatResult } from "../../utils/format";

const paymentTone = {
  paid: "success",
  overdue: "danger",
  pending: "warning",
} as const;

export default function CoachMemberDetail() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const member = useStore((s) => s.members.find((m) => m.id === id));
  const trainings = useStore((s) => s.trainingSessions);
  const results = useStore((s) => s.leaderboardResults);
  const categories = useStore((s) => s.leaderboardCategories);
  const membershipPlans = useStore((s) => s.membershipPlans);

  const paymentLabel = {
    paid: t("common.paid"),
    overdue: t("common.overdue"),
    pending: t("common.pending"),
  } as const;

  if (!member) {
    return (
      <div>
        <PageTitle title={t("coach_member_detail.not_found")} backTo="/coach/members" />
      </div>
    );
  }

  const plan = membershipPlans.find((p) => p.id === member.membershipPlanId);
  const upcoming = trainings.filter(
    (tr) =>
      tr.date >= todayIso() &&
      tr.registrations.some(
        (r) => r.memberId === member.id && r.status === "registered",
      ),
  );
  const past = trainings.filter(
    (tr) =>
      tr.date < todayIso() &&
      tr.registrations.some(
        (r) => r.memberId === member.id && r.status === "registered",
      ),
  );
  const bests = categories
    .map((c) => {
      const my = results
        .filter((r) => r.categoryId === c.id && r.memberId === member.id)
        .sort((a, b) =>
          c.lowerIsBetter ? a.value - b.value : b.value - a.value,
        )[0];
      return my ? { c, my } : null;
    })
    .filter(Boolean) as {
    c: (typeof categories)[number];
    my: (typeof results)[number];
  }[];

  return (
    <div>
      <PageTitle
        title={member.name}
        eyebrow={t("coach_member_detail.eyebrow")}
        backTo="/coach/members"
      />

      <section className="surface mb-4 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={member.name} color={member.avatarColor} size="xl" photoUrl={member.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{member.name}</p>
            <p className="text-sm text-ink-500">
              {plan?.name} · {member.ageGroup}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone={paymentTone[member.paymentStatus]} dot>
                {paymentLabel[member.paymentStatus]}
              </StatusBadge>
              <StatusBadge tone="neutral">
                {t("coach_member_detail.member_since", { date: formatDateSlash(member.memberSince) })}
              </StatusBadge>
              <StatusBadge tone="info">
                {formatCurrency(plan?.monthlyFee ?? 0)} {t("common.per_month")}
              </StatusBadge>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Mail className="h-4 w-4 text-ink-500" /> {t("coach_member_detail.contacts")}
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-ink-700 dark:text-ink-200">
              <Mail className="h-3.5 w-3.5 text-ink-400" /> {member.email}
            </li>
            <li className="flex items-center gap-2 text-ink-700 dark:text-ink-200">
              <Phone className="h-3.5 w-3.5 text-ink-400" /> {member.phone}
            </li>
          </ul>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Trophy className="h-4 w-4 text-ink-500" /> {t("coach_member_detail.personal_bests")}
          </h2>
          {bests.length === 0 ? (
            <p className="text-sm text-ink-500">
              {t("coach_member_detail.no_results")}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {bests.slice(0, 6).map(({ c, my }) => (
                <li
                  key={c.id}
                  className="rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800/60"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {c.event}
                  </p>
                  <p className="font-display text-base font-bold tabular-nums">
                    {formatResult(my.value, c)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <CalendarCheck2 className="h-4 w-4 text-ink-500" /> {t("coach_member_detail.upcoming_registrations")}
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">
              {t("coach_member_detail.no_upcoming")}
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((tr) => (
                <li
                  key={tr.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 dark:border-ink-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{tr.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatDateSlash(tr.date)} · {tr.startTime}
                    </p>
                  </div>
                  <Link
                    to={`/coach/trainings/${tr.id}`}
                    className="btn-ghost h-8 px-2 text-xs"
                  >
                    {t("common.open")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <CreditCard className="h-4 w-4 text-ink-500" /> {t("coach_member_detail.past_trainings")}
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-ink-500">{t("coach_member_detail.no_past")}</p>
          ) : (
            <ul className="space-y-2">
              {past.slice(0, 6).map((tr) => (
                <li
                  key={tr.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 dark:border-ink-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{tr.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatDateSlash(tr.date)} · {tr.startTime}
                    </p>
                  </div>
                  <Link
                    to={`/coach/trainings/${tr.id}`}
                    className="btn-ghost h-8 px-2 text-xs"
                  >
                    {t("common.open")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
