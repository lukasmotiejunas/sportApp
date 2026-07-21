import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, User, Users } from "lucide-react";
import { useStore } from "../../store/useStore";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";

type Props = {
  variant?: "compact" | "full";
};

export function DemoSwitcher({ variant = "compact" }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const role = useStore((s) => s.role);
  const members = useStore((s) => s.members);
  const currentMemberId = useStore((s) => s.currentMemberId);
  const setCurrentMemberId = useStore((s) => s.setCurrentMemberId);
  const currentCoachId = useStore((s) => s.currentCoachId);
  const setCurrentCoachId = useStore((s) => s.setCurrentCoachId);
  const coaches = useStore((s) => s.coaches);
  const setRole = useStore((s) => s.setRole);

  const activeMember =
    members.find((m) => m.id === currentMemberId) ?? members[0];
  const activeCoach =
    coaches.find((c) => c.id === currentCoachId) ?? coaches[0];

  const active = role === "coach" ? activeCoach : activeMember;
  const activeName = active?.name ?? "—";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "compact"
            ? "flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 backdrop-blur px-2 pr-3 h-9 hover:bg-white dark:border-ink-700 dark:bg-ink-900/70"
            : "flex w-full items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3 hover:border-ink-400 dark:border-ink-800 dark:bg-ink-900"
        }
        style={{ paddingLeft: 0 }}
        aria-label="Switch demo user"
      >
        <Avatar
          name={activeName}
          color={
            role === "coach"
              ? activeCoach?.avatarColor
              : activeMember?.avatarColor
          }
          size={variant === "compact" ? "sm" : "md"}
        />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs uppercase tracking-wide text-ink-500">
            Demo · {role ?? "guest"}
          </p>
          <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
            {activeName}
          </p>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-ink-400" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Switch prototype user"
        description="Prototype only — switch instantly between demo accounts to walk through the flows."
        size="lg"
      >
        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <Users className="h-3.5 w-3.5" /> Members
            </div>
            <div className="grid gap-1.5 max-h-72 overflow-y-auto pr-1">
              {members.map((m) => {
                const isActive = role === "member" && m.id === currentMemberId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const wasCoach = role === "coach";
                      setRole("member");
                      setCurrentMemberId(m.id);
                      setOpen(false);
                      if (wasCoach) navigate("/member");
                    }}
                    className={
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors " +
                      (isActive
                        ? "border-ink-900 bg-ink-900/5 dark:border-lime-400 dark:bg-lime-400/10"
                        : "border-ink-100 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-600")
                    }
                  >
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {m.name}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {m.preferredDistance}
                      </p>
                    </div>
                    <StatusBadge
                      tone={m.paymentStatus === "paid" ? "success" : "danger"}
                      dot
                    >
                      {m.paymentStatus}
                    </StatusBadge>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <User className="h-3.5 w-3.5" /> Coaches
            </div>
            <div className="grid gap-1.5">
              {coaches.map((c) => {
                const isActive = role === "coach" && c.id === currentCoachId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const wasMember = role === "member";
                      setRole("coach");
                      setCurrentCoachId(c.id);
                      setOpen(false);
                      if (wasMember) navigate("/coach");
                    }}
                    className={
                      "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors " +
                      (isActive
                        ? "border-ink-900 bg-ink-900/5 dark:border-lime-400 dark:bg-lime-400/10"
                        : "border-ink-100 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-600")
                    }
                  >
                    <Avatar name={c.name} color={c.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {c.specialty}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
