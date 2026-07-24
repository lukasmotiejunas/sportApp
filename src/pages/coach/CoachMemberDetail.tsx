import { Link, useParams } from "react-router-dom";
import {
  CalendarCheck2,
  CreditCard,
  Mail,
  Phone,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatDateShort, todayIso } from "../../utils/dates";
import { formatCurrency, formatResult } from "../../utils/format";
import type { PaymentStatus } from "../../types";

const paymentTone = {
  paid: "success",
  overdue: "danger",
  pending: "warning",
} as const;

const paymentLabel = { paid: "Apmokėta", overdue: "Vėluoja", pending: "Laukiama" } as const;

const paymentActions: PaymentStatus[] = ["paid", "overdue", "pending"];

export default function CoachMemberDetail() {
  const { id = "" } = useParams();
  const member = useStore((s) => s.members.find((m) => m.id === id));
  const trainings = useStore((s) => s.trainingSessions);
  const results = useStore((s) => s.leaderboardResults);
  const categories = useStore((s) => s.leaderboardCategories);
  const membershipPlans = useStore((s) => s.membershipPlans);
  const setPaymentStatus = useStore((s) => s.setPaymentStatus);
  const push = useStore((s) => s.pushToast);

  if (!member) {
    return (
      <div>
        <PageTitle title="Narys nerastas" backTo="/coach/members" />
      </div>
    );
  }

  const plan = membershipPlans.find((p) => p.id === member.membershipPlanId);
  const upcoming = trainings.filter(
    (t) =>
      t.date >= todayIso() &&
      t.registrations.some((r) => r.memberId === member.id),
  );
  const past = trainings.filter(
    (t) =>
      t.date < todayIso() &&
      t.registrations.some((r) => r.memberId === member.id),
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
        eyebrow="Nario profilis"
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
                Narys nuo {formatDateShort(member.memberSince)}
              </StatusBadge>
              <StatusBadge tone="info">
                {formatCurrency(plan?.monthlyFee ?? 0)} / mėn.
              </StatusBadge>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-1 sm:w-64">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Keisti mokėjimo būseną
            </p>
            <div className="flex flex-wrap gap-1">
              {paymentActions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPaymentStatus(member.id, s);
                    push({
                      kind: "success",
                      message: `Mokėjimo būsena pakeista į „${paymentLabel[s]}“.`,
                    });
                  }}
                  className={
                    "chip transition-colors " +
                    (member.paymentStatus === s
                      ? "bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950"
                      : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700")
                  }
                >
                  {paymentLabel[s]}
                </button>
              ))}
            </div>
            {member.paymentStatus === "overdue" && (
              <p className="mt-2 flex items-start gap-1 text-[11px] text-red-600">
                <ShieldAlert className="mt-0.5 h-3 w-3" />
                Šiam nariui registracija išjungta.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Mail className="h-4 w-4 text-ink-500" /> Kontaktai
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
            <Trophy className="h-4 w-4 text-ink-500" /> Asmeniniai rekordai
          </h2>
          {bests.length === 0 ? (
            <p className="text-sm text-ink-500">
              Rezultatų dar nėra.
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
            <CalendarCheck2 className="h-4 w-4 text-ink-500" /> Artėjančios
            registracijos
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">
              Nieko nesuplanuota — pakvieskite šį narį į treniruotę.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 dark:border-ink-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatDateShort(t.date)} · {t.startTime}
                    </p>
                  </div>
                  <Link
                    to={`/coach/trainings/${t.id}`}
                    className="btn-ghost h-8 px-2 text-xs"
                  >
                    Atidaryti
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <CreditCard className="h-4 w-4 text-ink-500" /> Ankstesnės treniruotės
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-ink-500">Ankstesnių treniruočių dar nėra.</p>
          ) : (
            <ul className="space-y-2">
              {past.slice(0, 6).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 dark:border-ink-800"
                >
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatDateShort(t.date)} · {t.startTime}
                    </p>
                  </div>
                  <Link
                    to={`/coach/trainings/${t.id}`}
                    className="btn-ghost h-8 px-2 text-xs"
                  >
                    Atidaryti
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
