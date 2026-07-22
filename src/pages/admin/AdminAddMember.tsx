import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField, SelectField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { createMemberApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import type { Member } from "../../types";

export default function AdminAddMember() {
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);
  const membershipPlans = useStore((s) => s.membershipPlans);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "unspecified" as Member["gender"],
    ageGroup: "",
    membershipPlanId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createMemberApi({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        ageGroup: form.ageGroup.trim() || undefined,
        membershipPlanId: form.membershipPlanId || undefined,
      });
      push({ kind: "success", message: "Narys sukurtas." });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nepavyko sukurti nario.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageTitle
        eyebrow="Administratorius"
        title="Pridėti narį"
        description="Sukuriama nario paskyra ir prisijungimas."
        backTo="/admin"
      />

      <form onSubmit={submit} className="surface space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Vardas ir pavardė"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="pvz. Alex Morgan"
            className="sm:col-span-2"
          />
          <FormField
            label="El. paštas"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="narys@pavyzdys.lt"
          />
          <FormField
            label="Pradinis slaptažodis"
            type="text"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Bent 6 simboliai."
          />
          <FormField
            label="Telefonas"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FormField
            label="Gimimo data"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <SelectField
            label="Lytis"
            value={form.gender}
            onChange={(e) =>
              setForm({ ...form, gender: e.target.value as Member["gender"] })
            }
          >
            <option value="unspecified">Nenurodyta</option>
            <option value="male">Vyras</option>
            <option value="female">Moteris</option>
          </SelectField>
          <FormField
            label="Amžiaus grupė"
            value={form.ageGroup}
            onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
            placeholder="pvz. Suaugusiųjų"
          />
          <SelectField
            label="Narystės planas"
            value={form.membershipPlanId}
            onChange={(e) => setForm({ ...form, membershipPlanId: e.target.value })}
          >
            <option value="">— Nepasirinkta —</option>
            {membershipPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
        </div>

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
            {submitting ? "Kuriama…" : "Sukurti narį"}
          </button>
        </div>
      </form>
    </div>
  );
}
