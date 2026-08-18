import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { Avatar } from "../ui/Avatar";
import {
  fetchTrainingComments,
  createTrainingCommentApi,
  deleteTrainingCommentApi,
} from "../../api/endpoints";
import type { TrainingComment } from "../../types";

const roleLabel: Record<TrainingComment["authorType"], string> = {
  member: "Narys",
  coach: "Treneris",
  admin: "Adminas",
};

const roleTone: Record<TrainingComment["authorType"], string> = {
  member: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
  coach: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrainingComments({ trainingId }: { trainingId: string }) {
  const authUser = useStore((s) => s.authUser);
  const push = useStore((s) => s.pushToast);
  const [comments, setComments] = useState<TrainingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTrainingComments(trainingId)
      .then(setComments)
      .catch(() =>
        push({ kind: "error", message: "Nepavyko įkelti komentarų." }),
      )
      .finally(() => setLoading(false));
  }, [trainingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const comment = await createTrainingCommentApi(trainingId, trimmed);
      setComments((prev) => [...prev, comment]);
      setBody("");
      textareaRef.current?.focus();
    } catch {
      push({ kind: "error", message: "Nepavyko išsaugoti komentaro." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteTrainingCommentApi(trainingId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      push({ kind: "error", message: "Nepavyko ištrinti komentaro." });
    }
  };

  const canDelete = (comment: TrainingComment) => {
    if (!authUser) return false;
    if (
      authUser.role === "admin" ||
      authUser.role === "coach" ||
      authUser.role === "super_admin"
    )
      return true;
    return comment.authorId === authUser.id;
  };

  return (
    <section className="surface p-4 md:col-span-2 mt-4">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold">
        <MessageSquare className="h-4 w-4 text-lime-600" />
        Komentarai
        {comments.length > 0 && (
          <span className="text-xs font-medium text-ink-500">
            · {comments.length}
          </span>
        )}
      </h3>

      {loading ? (
        <p className="text-sm text-ink-500">Kraunama…</p>
      ) : comments.length === 0 ? (
        <p className="mb-4 text-sm text-ink-500">
          Komentarų dar nėra. Būkite pirmas!
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{c.authorName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleTone[c.authorType]}`}
                  >
                    {roleLabel[c.authorType]}
                  </span>
                  <span className="text-xs text-ink-400">
                    {formatTime(c.createdAt)}
                  </span>
                  {canDelete(c) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto text-ink-400 hover:text-red-500"
                      aria-label="Ištrinti komentarą"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
              handleSubmit(e as any);
          }}
          placeholder="Parašykite komentarą…"
          rows={2}
          className="input flex-1 resize-none py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="btn-primary self-end px-3"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
