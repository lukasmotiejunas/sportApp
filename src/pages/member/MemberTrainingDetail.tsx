import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  Info,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { useStore, useCurrentMember } from "../../store/useStore";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CapacityProgress } from "../../components/trainings/CapacityProgress";
import { PageTitle } from "../../components/layout/PageTitle";
import { formatDateLong, relativeDay } from "../../utils/dates";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Avatar } from "../../components/ui/Avatar";
import type { TrainingPlan } from "../../types";

export default function MemberTrainingDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const member = useCurrentMember();
  const training = useStore((s) => s.trainingSessions.find((t) => t.id === id));
  const coaches = useStore((s) => s.coaches);
  const members = useStore((s) => s.members);
  const plans = useStore((s) => s.trainingPlans);
  const register = useStore((s) => s.registerForTraining);
  const cancel = useStore((s) => s.cancelRegistration);
  const push = useStore((s) => s.pushToast);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmLateRegister, setConfirmLateRegister] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const authUserId = useStore((s) => s.authUser?.id ?? "");
  const tourStorageKey = `member_training_detail_tour_seen:${authUserId || "anon"}`;

  useEffect(() => {
    if (!training) return;
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(training)]);

  const plan = useMemo(
    () =>
      plans.find(
        (p) =>
          p.memberId === member.id &&
          p.trainingSessionId === id &&
          p.status === "published",
      ),
    [plans, member.id, id],
  );

  const coach = useMemo(
    () => coaches.find((c) => c.id === training?.coachId),
    [coaches, training],
  );
  if (!training) {
    return (
      <div>
        <PageTitle title="Treniruotė nerasta" backTo="/member/trainings" />
      </div>
    );
  }

  const activeRegs = training.registrations.filter(
    (r) => r.status === "registered",
  );
  const waitlistRegs = training.registrations
    .filter((r) => r.status === "waitlisted")
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
  const registered = activeRegs
    .map((r) => members.find((m) => m.id === r.memberId))
    .filter(Boolean) as typeof members;
  const waitlisted = waitlistRegs
    .map((r) => members.find((m) => m.id === r.memberId))
    .filter(Boolean) as typeof members;
  const myEntry = training.registrations.find(
    (r) =>
      r.memberId === member.id &&
      (r.status === "registered" || r.status === "waitlisted"),
  );
  const isRegistered = myEntry?.status === "registered";
  const isWaitlisted = myEntry?.status === "waitlisted";
  const waitlistPosition = isWaitlisted
    ? waitlistRegs.findIndex((r) => r.memberId === member.id) + 1
    : 0;
  const isFull = activeRegs.length >= training.capacity;
  const isOverdue = member.paymentStatus === "overdue";
  const isCancelled = training.status === "cancelled";
  const isClosed = training.status === "closed";
  // Within 1h of start: cancelling a registration and joining the waitlist
  // are locked, but registering into a free spot is still allowed. Server
  // enforces the same rules.
  const minutesToStart =
    (new Date(`${training.date}T${training.startTime}`).getTime() -
      Date.now()) /
    60000;
  const withinCutoff = minutesToStart < 60;

  const doRegister = () => {
    const res = register(training.id, member.id);
    if (res.ok) {
      push({
        kind: "success",
        message: res.waitlisted
          ? "Įrašėme į laukiančiųjų sąrašą — pranešime, jei atsilaisvins vieta."
          : "Puiku — registracija į treniruotę patvirtinta.",
      });
    } else {
      push({
        kind: "error",
        message: res.error ?? "Nepavyko užsiregistruoti.",
      });
    }
  };

  const doCancel = () => {
    cancel(training.id, member.id);
    push({
      kind: "info",
      message: "Registracija atšaukta — vieta atlaisvinta.",
    });
  };

  const primary = () => {
    if (isCancelled)
      return (
        <button className="btn-outline flex-1" disabled>
          Treniruotė atšaukta
        </button>
      );
    if (isClosed)
      return (
        <button className="btn-outline flex-1" disabled>
          Registracija uždaryta
        </button>
      );
    if (isRegistered) {
      if (withinCutoff) {
        return (
          <button className="btn-outline flex-1" disabled>
            Iki treniruotės liko mažiau nei valanda — atšaukti nebegalima
          </button>
        );
      }
      return (
        <button
          className="btn-danger flex-1"
          onClick={() => setConfirmCancel(true)}
        >
          <XCircle className="h-4 w-4" /> Atšaukti registraciją
        </button>
      );
    }
    if (isWaitlisted) {
      return (
        <button
          className="btn-outline flex-1"
          onClick={() => setConfirmCancel(true)}
        >
          <XCircle className="h-4 w-4" /> Palikti laukiančiųjų sąrašą (pozicija{" "}
          {waitlistPosition})
        </button>
      );
    }
    if (isOverdue)
      return (
        <button
          className="btn-danger flex-1"
          onClick={() => navigate("/member/payments")}
        >
          Apmokėti norint atrakinti registraciją
        </button>
      );
    if (isFull) {
      if (withinCutoff) {
        return (
          <button className="btn-outline flex-1" disabled>
            Užpildyta — iki treniruotės liko mažiau nei valanda
          </button>
        );
      }
      return (
        <button className="btn-accent flex-1" onClick={doRegister}>
          Užpildyta · stoti į laukiančiųjų sąrašą
        </button>
      );
    }
    return (
      <button
        className="btn-accent flex-1"
        onClick={withinCutoff ? () => setConfirmLateRegister(true) : doRegister}
      >
        Užsiregistruoti į šią treniruotę
      </button>
    );
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Treniruotės detalės. Čia rasite visą informaciją apie šią treniruotę ir galėsite užsiregistruoti arba atsisakyti dalyvavimo.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="info"]',
      content:
        "Informacija apie treniruotę: aprašymas, laikas, vieta, treneris ir jo telefonas. Apačioje — talpos juosta rodo, kiek narių jau užsiregistravo ir kiek dar liko laisvų vietų.",
    },
    {
      target: '[data-tour="personal-plan"]',
      content:
        "Asmeninis planas — treneris gali paruošti individualią programą būtent jums. Kol jo dar nėra, čia matysite užrašą, kad planas ruošiamas. Kai bus paskelbtas, matysite pratimus ir trenerio pastabas.",
    },
    {
      target: '[data-tour="participants"]',
      content:
        "Užsiregistravę dalyviai. Matote kitus klubo narius, kurie taip pat dalyvaus. Jei atsiranda laukiančiųjų sąrašas, jis rodomas žemiau atskirai.",
      placement: "top",
    },
    {
      target: '[data-tour="action"]',
      content:
        "Pagrindinis veiksmas. Jei nesate užsiregistravę — „Užsiregistruoti“. Jei jau esate — čia galite atšaukti registraciją (iki 1 valandos prieš pradžią). Jei treniruotė užpildyta — įsirašysite į laukiančiųjų sąrašą ir gausite pranešimą, kai atsilaisvins vieta.",
      placement: "top",
    },
  ];

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, "1");
      } catch {
        // ignore
      }
    }
  };

  return (
    <div>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableScrolling={false}
        callback={handleTourCallback}
        locale={{
          back: "Atgal",
          close: "Uždaryti",
          last: "Baigti",
          next: "Toliau",
          skip: "Praleisti",
        }}
        styles={{
          options: {
            primaryColor: "#5da004",
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          title={training.title}
          eyebrow={`${relativeDay(training.date)} · ${training.startTime}`}
          backTo="/member/trainings"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="surface p-4" data-tour="info">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isRegistered && (
              <StatusBadge tone="accent" dot>
                Esate užsiregistravę
              </StatusBadge>
            )}
            {isWaitlisted && (
              <StatusBadge tone="warning" dot>
                Laukiančiųjų sąraše (pozicija {waitlistPosition})
              </StatusBadge>
            )}
            {isCancelled && (
              <StatusBadge tone="danger" dot>
                Atšaukta
              </StatusBadge>
            )}
            {isFull && !isRegistered && !isWaitlisted && !isCancelled && (
              <StatusBadge tone="danger" dot>
                Treniruotė užpildyta
              </StatusBadge>
            )}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            {training.description}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <InfoRow
              icon={Clock}
              label="Laikas"
              value={`${training.startTime}–${training.endTime}`}
            />
            <InfoRow icon={MapPin} label="Vieta" value={training.location} />
            <InfoRow
              icon={UserRound}
              label="Treneris"
              value={coach?.name ?? "Nenurodyta"}
            />
            <InfoRow
              icon={Info}
              label="Data"
              value={formatDateLong(training.date)}
            />
            {coach?.phone && (
              <InfoRow
                icon={Phone}
                label="Trenerio telefonas"
                value={coach.phone}
                href={`tel:${coach.phone.replace(/\s+/g, "")}`}
              />
            )}
          </div>

          <div className="mt-4">
            <CapacityProgress
              registered={activeRegs.length}
              capacity={training.capacity}
            />
            {waitlistRegs.length > 0 && (
              <p className="mt-2 text-xs font-medium text-ink-500">
                Laukiančiųjų sąraše: {waitlistRegs.length}
                {isWaitlisted && ` · jūsų pozicija ${waitlistPosition}`}
              </p>
            )}
          </div>
        </section>

        <PersonalPlanPanel plan={plan} />

        <section
          className="surface p-4 md:col-span-2"
          data-tour="participants"
        >
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Sparkles className="h-4 w-4 text-lime-600" />
            Užsiregistravę dalyviai
            <span className="text-xs font-medium text-ink-500">
              · {registered.length} iš {training.capacity}
            </span>
          </h3>
          {registered.length === 0 ? (
            <p className="text-sm text-ink-500">
              Būkite pirmasis užsiregistravęs į šią treniruotę.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {registered.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-100 p-2 dark:border-ink-800"
                >
                  <Avatar name={m.name} color={m.avatarColor} size="sm" photoUrl={m.photoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {waitlisted.length > 0 && (
          <section className="surface p-4 md:col-span-2">
            <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
              <Sparkles className="h-4 w-4 text-lime-600" />
              Laukiantys dalyviai
              <span className="text-xs font-medium text-ink-500">
                · {waitlisted.length}
              </span>
            </h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {waitlisted.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-100 p-2 dark:border-ink-800"
                >
                  <Avatar
                    name={m.name}
                    color={m.avatarColor}
                    size="sm"
                    photoUrl={m.photoUrl}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sticky action */}
      <div
        className="fixed inset-x-0 bottom-20 z-20 mx-auto max-w-4xl px-4 pb-2 md:static md:mt-4 md:px-0"
        data-tour="action"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-100 bg-white/95 p-2 shadow-pop backdrop-blur md:border-transparent md:bg-transparent md:p-0 md:shadow-none dark:border-ink-800 dark:bg-ink-950/95 md:dark:bg-transparent">
          {primary()}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Atšaukti šią registraciją?"
        message="Jūsų vieta bus atlaisvinta kitam klubo nariui. Galėsite užsiregistruoti vėliau, kol dar bus laisvų vietų."
        confirmLabel="Atšaukti registraciją"
        cancelLabel="Palikti registraciją"
        destructive
      />

      <ConfirmDialog
        open={confirmLateRegister}
        onClose={() => setConfirmLateRegister(false)}
        onConfirm={doRegister}
        title="Registruotis likus mažiau nei valandai?"
        message="Iki treniruotės pradžios liko mažiau nei viena valanda — užsiregistravę nebegalėsite atšaukti registracijos. Ar tikrai norite registruotis?"
        confirmLabel="Taip, registruotis"
        cancelLabel="Atšaukti"
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon className="h-4 w-4 text-ink-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
          {value}
        </p>
      </div>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 transition-colors hover:bg-ink-100 dark:bg-ink-800/60 dark:hover:bg-ink-800"
      >
        {body}
      </a>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800/60">
      {body}
    </div>
  );
}

function PersonalPlanPanel({ plan }: { plan?: TrainingPlan }) {
  if (!plan) {
    return (
      <section
        className="surface flex flex-col items-center justify-center p-6 text-center"
        data-tour="personal-plan"
      >
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
          <ClipboardList className="h-5 w-5" />
        </span>
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
          Asmeninis planas ruošiamas
        </h3>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          Jūsų treneris netrukus paskelbs asmeninį planą šiai treniruotei.
          Užsukite arčiau treniruotės dienos.
        </p>
      </section>
    );
  }

  return (
    <section
      className="surface relative flex flex-col overflow-hidden p-4"
      data-tour="personal-plan"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-lime-600 dark:text-lime-300">
            Asmeninis planas
          </p>
          <h3 className="mt-0.5 truncate font-display text-base font-bold text-ink-900 dark:text-ink-50">
            {plan.title}
          </h3>
        </div>
        {plan.duration > 0 && (
          <span className="shrink-0 text-[10px] font-semibold text-ink-500">
            ~{plan.duration} min
          </span>
        )}
      </div>

      {plan.coachNote && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-lime-400/25 bg-lime-50/70 p-3 dark:bg-lime-400/[0.08]">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-300" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-300">
              Trenerio užrašas
            </p>
            <p className="mt-0.5 text-sm text-ink-700 dark:text-ink-100">
              {plan.coachNote}
            </p>
          </div>
        </div>
      )}

      {plan.plan && (
        <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 dark:text-ink-200">
          {plan.plan}
        </pre>
      )}
    </section>
  );
}
