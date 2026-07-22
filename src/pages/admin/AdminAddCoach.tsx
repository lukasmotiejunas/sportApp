import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { createCoachApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export default function AdminAddCoach() {
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialty: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCoachApi({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        specialty: form.specialty.trim() || undefined,
      });
      push({ kind: "success", message: "Treneris sukurtas." });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nepavyko sukurti trenerio.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageTitle
        eyebrow="Administratorius"
        title="Pridėti trenerį"
        description="Sukuriama trenerio paskyra ir prisijungimas."
        backTo="/admin"
      />

      <form onSubmit={submit} className="surface space-y-4 p-4">
        <FormField
          label="Vardas ir pavardė"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="pvz. Elena Ruiz"
        />
        <FormField
          label="El. paštas"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="treneris@pavyzdys.lt"
        />
        <FormField
          label="Pradinis slaptažodis"
          type="text"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          hint="Bent 6 simboliai. Treneris galės jį pakeisti vėliau."
        />
        <FormField
          label="Specializacija"
          value={form.specialty}
          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          placeholder="pvz. Sprintas ir technika"
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate("/admin")}>
            Atšaukti
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <UserPlus className="h-4 w-4" />
            {submitting ? "Kuriama…" : "Sukurti trenerį"}
          </button>
        </div>
      </form>
    </div>
  );
}
