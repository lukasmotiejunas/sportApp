import clsx from 'clsx';
import { Check, Clock, Gauge, GripVertical, Repeat, Route, Trash2 } from 'lucide-react';
import type { PlanExercise } from '../../types';

type Props = {
  exercise: PlanExercise;
  index: number;
  editable?: boolean;
  onToggleComplete?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  showCheck?: boolean;
};

export function ExerciseBlock({
  exercise,
  index,
  editable,
  onToggleComplete,
  onEdit,
  onRemove,
  showCheck = false,
}: Props) {
  const meta = [
    exercise.repetitions && { icon: Repeat, label: exercise.repetitions },
    exercise.distance && { icon: Route, label: exercise.distance },
    exercise.time && { icon: Clock, label: exercise.time },
    exercise.pace && { icon: Gauge, label: exercise.pace },
    exercise.rest && { icon: Clock, label: 'Rest ' + exercise.rest },
  ].filter(Boolean) as Array<{ icon: any; label: string }>;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-2xl border p-3 transition-colors',
        exercise.completedByMember
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900',
      )}
    >
      {editable && (
        <button
          type="button"
          className="mt-1 cursor-grab text-ink-400 hover:text-ink-700"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {showCheck && (
        <button
          type="button"
          onClick={onToggleComplete}
          aria-pressed={!!exercise.completedByMember}
          aria-label={
            exercise.completedByMember ? 'Mark exercise incomplete' : 'Mark exercise complete'
          }
          className={clsx(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
            exercise.completedByMember
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-ink-200 hover:border-ink-500 dark:border-ink-700',
          )}
        >
          {exercise.completedByMember && <Check className="h-3.5 w-3.5" />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-ink-400">{String(index + 1).padStart(2, '0')}</span>
          <h4 className="text-sm font-semibold text-ink-900 dark:text-ink-50">{exercise.title}</h4>
        </div>
        <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{exercise.detail}</p>
        {meta.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200"
              >
                <m.icon className="h-3 w-3" />
                {m.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {editable && (
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
