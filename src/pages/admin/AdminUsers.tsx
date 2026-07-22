import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, RefreshCw } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Avatar } from "../../components/ui/Avatar";
import { fetchUsers } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import type { AuthUser } from "../../types";

const roleTone: Record<AuthUser["role"], "accent" | "info" | "success"> = {
  admin: "accent",
  coach: "info",
  member: "success",
};

const roleLabel: Record<AuthUser["role"], string> = {
  admin: "Administratorius",
  coach: "Treneris",
  member: "Narys",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            </div>
          ))
        )}
      </section>
    </div>
  );
}
