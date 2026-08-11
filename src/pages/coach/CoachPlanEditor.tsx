import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormField, TextareaField } from "../../components/ui/FormField";
import type { TrainingPlan } from "../../types";
import { formatDateSlash, todayIso } from "../../utils/dates";
import { useTrainingsBase } from "../../utils/roleContext";

export default function CoachPlanEditor() {
  const { t } = useTranslation();
  const { trainingId = "", memberId = "" } = useParams();
  const navigate = useNavigate();
  const { base } = useTrainingsBase();
  const training = useStore((s) =>
    s.trainingSessions.find((tr) => tr.id === trainingId),
  );
  const member = useStore((s) => s.members.find((m) => m.id === memberId));
  const plans = useStore((s) => s.trainingPlans);
  const upsert = useStore((s) => s.upsertPlan);
  const publish = useStore((s) => s.publishPlan);
  const remove = useStore((s) => s.deletePlan);
  const push = useStore((s) => s.pushToast);

  const existingPlan = useMemo(
    () =>
      plans.find(
        (p) => p.trainingSessionId === trainingId && p.memberId === memberId,
      ),
    [plans, trainingId, memberId],
  );

  const [plan, setPlan] = useState<TrainingPlan>(
    () =>
      existingPlan ?? {
        id: "plan-" + Math.random().toString(36).slice(2, 8),
        trainingSessionId: trainingId,
        memberId,
        title: training
          ? `${training.title} — ${member?.name.split(" ")[0]}`
          : t("coach_plan_editor.new_plan_title"),
        duration: 0,
        coachNote: "",
        plan: "",
        status: "draft",
        updatedAt: todayIso(),
      },
  );

  if (!training || !member) {
    return (
      <div>
        <PageTitle title={t("coach_plan_editor.not_found")} backTo="/coach/trainings" />
      </div>
    );
  }

  const saveDraft = () => {
    const next = { ...plan, status: "draft" as const, updatedAt: todayIso() };
    upsert(next);
    setPlan(next);
    push({ kind: "success", message: t("coach_plan_editor.draft_saved") });
  };

  const publishAndSave = () => {
    const next = {
      ...plan,
      status: "published" as const,
      updatedAt: todayIso(),
    };
    upsert(next);
    publish(next.id);
    setPlan(next);
    push({
      kind: "success",
      message: t("coach_plan_editor.plan_published"),
    });
  };

  const deleteThis = () => {
    if (existingPlan) {
      remove(existingPlan.id);
      push({ kind: "info", message: t("coach_plan_editor.plan_deleted") });
    }
    navigate(`${base}/${training.id}`);
  };

  return (
    <div>
      <PageTitle
        eyebrow={t("coach_plan_editor.eyebrow")}
        title={plan.title || t("coach_plan_editor.new_plan_title")}
        description={`${training.title} · ${formatDateSlash(training.date)} · ${training.startTime}`}
        backTo={`${base}/${training.id}`}
      />

      <section className="surface p-4">
        <div className="mb-4 flex items-center gap-3">
          <Avatar
            name={member.name}
            color={member.avatarColor}
            size="md"
            photoUrl={member.photoUrl}
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold">{member.name}</p>
            <p className="text-xs text-ink-500">{member.ageGroup}</p>
          </div>
          <StatusBadge
            tone={plan.status === "published" ? "accent" : "warning"}
            dot
          >
            {plan.status === "published" ? t("coach_plan_editor.status_published") : t("coach_plan_editor.status_draft")}
          </StatusBadge>
        </div>

        <div className="grid gap-3">
          <FormField
            label={t("coach_plan_editor.plan_name_label")}
            value={plan.title}
            onChange={(e) => setPlan({ ...plan, title: e.target.value })}
          />
          <TextareaField
            label={t("coach_plan_editor.coach_note_label")}
            value={plan.coachNote}
            onChange={(e) => setPlan({ ...plan, coachNote: e.target.value })}
            placeholder={t("coach_plan_editor.coach_note_placeholder")}
          />
          <TextareaField
            label={t("coach_plan_editor.plan_body_label")}
            value={plan.plan}
            onChange={(e) => setPlan({ ...plan, plan: e.target.value })}
            rows={12}
            placeholder={t("coach_plan_editor.plan_body_placeholder")}
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          {existingPlan && (
            <button type="button" className="btn-danger" onClick={deleteThis}>
              <Trash2 className="h-4 w-4" /> {t("coach_plan_editor.delete_plan")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-accent" onClick={publishAndSave}>
            <Send className="h-4 w-4" /> {t("coach_plan_editor.publish_label")}
          </button>
        </div>
      </div>
    </div>
  );
}
