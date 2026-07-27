import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Trash2, UserPlus } from "lucide-react";
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
  const push = useStore((s) => s.pushToast);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AuthUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <Link to="/admin/members/new" className="btn-outline">
          <UserPlus className="h-4 w-4" /> Pridėti narį
        </Link>
        <button type="button" className="btn-ghost ml-auto" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Atnaujinti
        </button>
      </div>

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
