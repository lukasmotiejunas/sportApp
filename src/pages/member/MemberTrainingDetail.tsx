import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList,
  Clock,
  Info,
  MapPin,
  MessageSquareText,
  Sparkles,
  UserRound,
  XCircle,
} from "lucide-react";
import { useStore, useCurrentMember } from "../../store/useStore";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CapacityProgress } from "../../components/trainings/CapacityProgress";
import { PageTitle } from "../../components/layout/PageTitle";
import { Modal } from "../../components/ui/Modal";
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
  const [planOpen, setPlanOpen] = useState(false);

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
        <PageTitle title="Training not found" backTo="/member/trainings" />
      </div>
    );
  }

  const registered = training.registrations
    .map((r) => members.find((m) => m.id === r.memberId))
    .filter(Boolean) as typeof members;
  const isRegistered = training.registrations.some(
    (r) => r.memberId === member.id,
  );
  const isFull = training.registrations.length >= training.capacity;
  const isOverdue = member.paymentStatus === "overdue";
  const isCancelled = training.status === "cancelled";
  const isClosed = training.status === "closed";

  const doRegister = () => {
    const res = register(training.id, member.id);
    if (res.ok) {
      push({
        kind: "success",
        message: "You’re in — training registration completed.",
      });
    } else {
      push({ kind: "error", message: res.error ?? "Could not register." });
    }
  };

  const doCancel = () => {
    cancel(training.id, member.id);
    push({
      kind: "info",
      message: "Registration cancelled — a spot has been released.",
    });
  };

  const primary = () => {
    if (isRegistered) {
      return (
        <button
          className="btn-danger flex-1"
          onClick={() => setConfirmCancel(true)}
        >
          <XCircle className="h-4 w-4" /> Cancel my registration
        </button>
      );
    }
    if (isCancelled)
      return (
        <button className="btn-outline flex-1" disabled>
          Session cancelled
        </button>
      );
    if (isClosed)
      return (
        <button className="btn-outline flex-1" disabled>
          Registration closed
        </button>
      );
    if (isOverdue)
      return (
        <button
          className="btn-danger flex-1"
          onClick={() => navigate("/member/payments")}
        >
          Pay to unlock registration
        </button>
      );
    if (isFull) {
      return (
        <button className="btn-outline flex-1" disabled>
          Full · join waiting list (prototype)
        </button>
      );
    }
    return (
      <button className="btn-accent flex-1" onClick={doRegister}>
        Register for this session
      </button>
    );
  };

  return (
    <div>
      <PageTitle
        title={training.title}
        eyebrow={`${relativeDay(training.date)} · ${training.startTime}`}
        backTo="/member/trainings"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="chip bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
              {training.difficulty}
            </span>
            {isRegistered && (
              <StatusBadge tone="accent" dot>
                You&apos;re registered
              </StatusBadge>
            )}
            {isCancelled && (
              <StatusBadge tone="danger" dot>
                Cancelled
              </StatusBadge>
            )}
            {isFull && !isRegistered && !isCancelled && (
              <StatusBadge tone="danger" dot>
                Session full
              </StatusBadge>
            )}
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">
            {training.description}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <InfoRow
              icon={Clock}
              label="Time"
              value={`${training.startTime}–${training.endTime}`}
            />
            <InfoRow icon={MapPin} label="Location" value={training.location} />
            <InfoRow
              icon={UserRound}
              label="Coach"
              value={coach?.name ?? "TBA"}
            />
            <InfoRow
              icon={Info}
              label="Date"
              value={formatDateLong(training.date)}
            />
          </div>

          <div className="mt-4">
            <CapacityProgress
              registered={training.registrations.length}
              capacity={training.capacity}
            />
          </div>
        </section>

        <PersonalPlanPanel plan={plan} onExpand={() => setPlanOpen(true)} />

        <section className="surface p-4 md:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Sparkles className="h-4 w-4 text-lime-600" />
            Registered participants
            <span className="text-xs font-medium text-ink-500">
              · {registered.length} of {training.capacity}
            </span>
          </h3>
          {registered.length === 0 ? (
            <p className="text-sm text-ink-500">
              Be the first to register for this session.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {registered.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-ink-100 p-2 dark:border-ink-800"
                >
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sticky action */}
      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-4xl px-4 pb-2 md:static md:mt-4 md:px-0">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-100 bg-white/95 p-2 shadow-pop backdrop-blur md:border-transparent md:bg-transparent md:p-0 md:shadow-none dark:border-ink-800 dark:bg-ink-950/95 md:dark:bg-transparent">
          {primary()}
        </div>
      </div>

      <FullPlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        plan={plan}
        sessionTitle={training.title}
      />

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
        title="Cancel this registration?"
        message="Your spot will be released to another club member. You can register again later while spots are available."
        confirmLabel="Cancel registration"
        cancelLabel="Keep me in"
        destructive
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 dark:bg-ink-800/60">
      <Icon className="h-4 w-4 text-ink-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
          {value}
        </p>
      </div>
    </div>
  );
}

function PersonalPlanPanel({
  plan,
  onExpand,
}: {
  plan?: TrainingPlan;
  onExpand: () => void;
}) {
  if (!plan) {
    return (
      <section className="surface flex flex-col items-center justify-center p-6 text-center">
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
          <ClipboardList className="h-5 w-5" />
        </span>
        <h3 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
          Personal plan on the way
        </h3>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          Your coach will publish a personalised plan for this session soon.
          Check back closer to the day.
        </p>
      </section>
    );
  }

  return (
    <section className="surface relative flex flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-lime-600 dark:text-lime-300">
            Personal plan
          </p>
          <h3 className="mt-0.5 truncate font-display text-base font-bold text-ink-900 dark:text-ink-50">
            {plan.title}
          </h3>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-ink-500">
          ~{plan.duration} min
        </span>
      </div>

      <div className="relative max-h-72 overflow-hidden">
        {plan.coachNote && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-lime-400/25 bg-lime-50/70 p-3 dark:bg-lime-400/[0.08]">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-300" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-300">
                Coach note
              </p>
              <p className="mt-0.5 line-clamp-3 text-sm text-ink-700 dark:text-ink-100">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white via-white/85 to-transparent dark:from-ink-900 dark:via-ink-900/85" />
      </div>

      <button
        type="button"
        onClick={onExpand}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-white px-3 py-2.5 text-sm font-semibold text-ink-800 shadow-sm transition-colors hover:border-lime-400/50 hover:bg-lime-50/50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:border-lime-400/40 dark:hover:bg-lime-400/[0.06]"
      >
        View full plan
      </button>
    </section>
  );
}

function FullPlanModal({
  open,
  onClose,
  plan,
  sessionTitle,
}: {
  open: boolean;
  onClose: () => void;
  plan?: TrainingPlan;
  sessionTitle: string;
}) {
  if (!plan) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400/15 text-lime-700 dark:text-lime-200">
            <ClipboardList className="h-4 w-4" />
          </span>
          {plan.title}
        </span>
      }
      description={
        <span className="text-xs text-ink-500">
          ~{plan.duration} min · {sessionTitle}
        </span>
      }
    >
      {plan.coachNote && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-lime-400/25 bg-lime-50/70 p-3.5 dark:bg-lime-400/[0.08]">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-lime-600 dark:text-lime-300" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-lime-700 dark:text-lime-300">
              Coach note
            </p>
            <p className="mt-1 text-sm text-ink-700 dark:text-ink-100">
              {plan.coachNote}
            </p>
          </div>
        </div>
      )}

      {plan.plan ? (
        <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 dark:text-ink-200">
          {plan.plan}
        </pre>
      ) : (
        <p className="text-sm text-ink-500">The coach hasn’t written the plan details yet.</p>
      )}
    </Modal>
  );
}
