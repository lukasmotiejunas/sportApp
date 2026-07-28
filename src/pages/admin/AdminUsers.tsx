import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, LinkIcon, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Avatar } from "../../components/ui/Avatar";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  deleteCoachApi,
  deleteMemberApi,
  fetchUsers,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useStore } from "../../store/useStore";
import type { AuthUser } from "../../types";

const roleTone: Record<AuthUser["role"], "accent" | "info" | "success"> = {
  super_admin: "accent",
  admin: "accent",
  coach: "info",
  member: "success",
};

const roleLabel: Record<AuthUser["role"], string> = {
  super_admin: "Platformos savininkas",
  admin: "Administratorius",
  coach: "Treneris",
  member: "Narys",
};

export default function AdminUsers() {
  const currentUserId = useStore((s) => s.authUser?.id ?? "");
  const clubSlug = useStore((s) => s.authUser?.clubSlug ?? "");
  const push = useStore((s) => s.pushToast);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AuthUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const joinUrl = useMemo(
    () => (clubSlug ? `${window.location.origin}/join/${clubSlug}` : ""),
    [clubSlug],
  );

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {
      push({ kind: "error", message: "Nepavyko nukopijuoti nuorodos." });
    }
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchUsers()
      .then((u) => setUsers(u))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Nepavyko įkelti paskyrų."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const doDelete = async (user: AuthUser) => {
    setDeletingId(user.id);
    try {
      if (user.role === "member" && user.memberId) {
        await deleteMemberApi(user.memberId);
      } else if (user.role === "coach" && user.coachId) {
        await deleteCoachApi(user.coachId);
      } else {
        throw new Error("Ši paskyra negali būti ištrinta.");
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      push({ kind: "success", message: `„${user.name ?? user.email}" ištrintas.` });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko ištrinti paskyros.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (u: AuthUser) =>
    u.id !== currentUserId && (u.role === "member" || u.role === "coach");

  return (
    <div>
      <PageTitle
        eyebrow="Administratorius"
        title="Paskyros"
        description="Valdykite trenerių ir narių prisijungimus."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link to="/admin/coaches/new" className="btn-primary">
          <UserPlus className="h-4 w-4" /> Pridėti trenerį
        </Link>
        <button type="button" className="btn-ghost ml-auto" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Atnaujinti
        </button>
      </div>

      {joinUrl && (
        <div className="mb-4 rounded-2xl border border-lime-300 bg-lime-50 p-4 dark:border-lime-500/30 dark:bg-lime-500/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-ink-950 dark:bg-lime-400 dark:text-ink-950">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-ink-900 dark:text-lime-100">
                Nario registracijos nuoroda
              </p>
              <p className="mt-0.5 text-xs text-ink-700 dark:text-lime-100/80">
                Nauji nariai gali užsiregistruoti patys — pasidalinkite šia nuoroda.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-xs text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100">
                  {joinUrl}
                </code>
                <button
                  type="button"
                  onClick={copyJoinLink}
                  className="btn-outline h-9 px-3 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedLink ? "Nukopijuota" : "Kopijuoti"}
                </button>
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost h-9 px-3 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Atidaryti
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="surface divide-y divide-ink-100 dark:divide-ink-800">
        {loading ? (
          <p className="p-4 text-sm text-ink-500">Kraunama…</p>
        ) : users.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">Paskyrų nėra.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <Avatar name={u.name ?? u.email} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                  {u.name ?? "—"}
                </p>
                <p className="truncate text-xs text-ink-500">{u.email}</p>
              </div>
              <StatusBadge tone={roleTone[u.role]} dot>
                {roleLabel[u.role]}
              </StatusBadge>
              {canDelete(u) && (
                <button
                  type="button"
                  className="btn-ghost h-9 px-2 text-sm text-red-600 disabled:opacity-40"
                  onClick={() => setPendingDelete(u)}
                  disabled={deletingId === u.id}
                  aria-label={`Ištrinti ${u.name ?? u.email}`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Ištrinti</span>
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void doDelete(pendingDelete);
          setPendingDelete(null);
        }}
        title={
          pendingDelete?.role === "coach"
            ? `Ištrinti trenerį „${pendingDelete?.name ?? pendingDelete?.email}"?`
            : `Ištrinti narį „${pendingDelete?.name ?? pendingDelete?.email}"?`
        }
        message={
          pendingDelete?.role === "coach"
            ? "Bus pašalinta trenerio paskyra ir prisijungimo duomenys. Jei treneriui priskirtos treniruotės, ištrinti nepavyks — pirmiausia jas perskirstykite arba ištrinkite."
            : "Bus pašalintas narys, jo prisijungimo duomenys, treniruočių registracijos, individualūs planai ir rezultatai. Šio veiksmo atšaukti nebus galima."
        }
        confirmLabel="Ištrinti"
        cancelLabel="Atšaukti"
        destructive
      />
    </div>
  );
}
