import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { createClubApi } from "../../api/superadmin";
import { ApiError } from "../../api/client";

export default function SuperAdminCreateClub() {
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const club = await createClubApi({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        adminName: form.adminName.trim() || undefined,
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });
      push({ kind: "success", message: `Klubas „${club.name}" sukurtas.` });
      navigate(`/superadmin/clubs/${club.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nepavyko sukurti klubo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageTitle
        eyebrow="Platforma"
        title="Naujas klubas"
        description="Sukuriamas klubas ir jo pirmasis administratorius."
        backTo="/superadmin"
      />

      <form onSubmit={submit} className="surface space-y-4 p-4">
        <FormField
          label="Klubo pavadinimas"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="pvz. SportApp Vilnius"
        />
        <FormField
          label="Slug (nebūtina)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="sportapp-vilnius"
          hint="Jei paliksite tuščią — bus sugeneruotas automatiškai."
        />

        <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
          <h3 className="mb-3 font-display text-sm font-bold text-ink-900 dark:text-ink-50">
            Pirmasis administratorius
          </h3>
          <div className="space-y-4">
            <FormField
              label="Vardas"
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              placeholder="Klubo savininkas"
            />
            <FormField
              label="El. paštas"
              type="email"
              required
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              placeholder="admin@klubas.lt"
            />
            <FormField
              label="Pradinis slaptažodis"
              type="text"
              required
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
              hint="Bent 6 simboliai. Administratorius galės jį pakeisti vėliau."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/superadmin")}
          >
            Atšaukti
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Building2 className="h-4 w-4" />
            {submitting ? "Kuriama…" : "Sukurti klubą"}
          </button>
        </div>
      </form>
    </div>
  );
}
