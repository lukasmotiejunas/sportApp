import { useEffect, useState } from "react";
import { Building2, KeyRound, User } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { ApiError } from "../../api/client";
import {
  changePasswordApi,
  updateClubApi,
  updateSelfApi,
} from "../../api/profile";

export default function AdminProfile() {
  const authUser = useStore((s) => s.authUser);
  const patchAuthUser = useStore((s) => s.patchAuthUser);
  const push = useStore((s) => s.pushToast);

  // Club section
  const [clubName, setClubName] = useState(authUser?.clubName ?? "");
  const [clubBusy, setClubBusy] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);

  // Personal info section
  const [name, setName] = useState(authUser?.name ?? "");
  const [email, setEmail] = useState(authUser?.email ?? "");
  const [selfBusy, setSelfBusy] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  // Password section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Re-sync local state when authUser refreshes (e.g. after bootstrap).
  useEffect(() => {
    setClubName(authUser?.clubName ?? "");
    setName(authUser?.name ?? "");
    setEmail(authUser?.email ?? "");
  }, [authUser]);

  const submitClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setClubError(null);
    const trimmed = clubName.trim();
    if (trimmed.length < 2) {
      setClubError("Klubo pavadinimas per trumpas.");
      return;
    }
    setClubBusy(true);
    try {
      const updated = await updateClubApi({ name: trimmed });
      patchAuthUser({ clubName: updated.name });
      push({ kind: "success", message: "Klubo informacija atnaujinta." });
    } catch (err) {
      setClubError(
        err instanceof ApiError ? err.message : "Nepavyko atnaujinti klubo.",
      );
    } finally {
      setClubBusy(false);
    }
  };

  const submitSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim().toLowerCase();
    if (nameTrimmed.length < 2) {
      setSelfError("Vardas per trumpas.");
      return;
    }
    if (!emailTrimmed) {
      setSelfError("El. paštas privalomas.");
      return;
    }

    // Only send fields that actually changed.
    const patch: { name?: string; email?: string } = {};
    if (nameTrimmed !== (authUser?.name ?? "")) patch.name = nameTrimmed;
    if (emailTrimmed !== (authUser?.email ?? "")) patch.email = emailTrimmed;
    if (Object.keys(patch).length === 0) {
      push({ kind: "info", message: "Duomenys nepakito." });
      return;
    }

    setSelfBusy(true);
    try {
      const updated = await updateSelfApi(patch);
      patchAuthUser({ name: updated.name, email: updated.email });
      push({ kind: "success", message: "Jūsų duomenys atnaujinti." });
    } catch (err) {
      setSelfError(
        err instanceof ApiError ? err.message : "Nepavyko atnaujinti.",
      );
    } finally {
      setSelfBusy(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError("Naujas slaptažodis turi būti bent 6 simbolių.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Nauji slaptažodžiai nesutampa.");
      return;
    }
    setPwBusy(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      push({ kind: "success", message: "Slaptažodis pakeistas." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko pakeisti slaptažodžio.",
      );
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow="Administratorius"
        title="Profilis"
        description="Redaguokite klubo informaciją, savo duomenis ir keiskite slaptažodį."
      />

      <div className="space-y-6">
        <section className="surface p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                Klubo informacija
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Klubo pavadinimą mato nariai, treneriai ir figūruoja sąskaitose.
              </p>
            </div>
          </div>
          <form onSubmit={submitClub} className="space-y-4">
            <FormField
              label="Klubo pavadinimas"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="pvz. SportApp Vilnius"
            />
            {clubError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {clubError}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={clubBusy}>
                {clubBusy ? "Saugoma…" : "Išsaugoti"}
              </button>
            </div>
          </form>
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                Jūsų duomenys
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                El. paštu prisijungsite prie klubo. Pakeitus jį, kitą kartą junkitės naujuoju.
              </p>
            </div>
          </div>
          <form onSubmit={submitSelf} className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Vardas ir pavardė"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vardenis Pavardenis"
            />
            <FormField
              label="El. paštas"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jus@klubas.lt"
            />
            {selfError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                {selfError}
              </div>
            )}
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={selfBusy}>
                {selfBusy ? "Saugoma…" : "Išsaugoti"}
              </button>
            </div>
          </form>
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                Slaptažodis
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Norėdami pakeisti slaptažodį, pirma įveskite dabartinį.
              </p>
            </div>
          </div>
          <form onSubmit={submitPassword} className="space-y-4">
            <FormField
              label="Dabartinis slaptažodis"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Naujas slaptažodis"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Bent 6 simboliai"
              />
              <FormField
                label="Pakartokite naują slaptažodį"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Bent 6 simboliai"
              />
            </div>
            {pwError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {pwError}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={pwBusy}>
                {pwBusy ? "Keičiama…" : "Pakeisti slaptažodį"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
