import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Trash2, User } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { Avatar } from "../../components/ui/Avatar";
import { useStore, useCurrentCoach } from "../../store/useStore";
import { ApiError } from "../../api/client";
import {
  changePasswordApi,
  updateCoachSelfApi,
} from "../../api/profile";
import { resizeImageToDataUrl } from "../../utils/image";

export default function CoachProfile() {
  const coach = useCurrentCoach();
  const authUser = useStore((s) => s.authUser);
  const patchCoach = useStore((s) => s.patchCoach);
  const patchAuthUser = useStore((s) => s.patchAuthUser);
  const push = useStore((s) => s.pushToast);

  const [name, setName] = useState(coach?.name ?? "");
  const [specialty, setSpecialty] = useState(coach?.specialty ?? "");
  const [phone, setPhone] = useState(coach?.phone ?? "");
  const [selfBusy, setSelfBusy] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setName(coach?.name ?? "");
    setSpecialty(coach?.specialty ?? "");
    setPhone(coach?.phone ?? "");
  }, [coach?.name, coach?.specialty, coach?.phone]);

  if (!coach) {
    return (
      <div>
        <PageTitle title="Profilis" eyebrow="Treneris" />
        <p className="text-sm text-ink-500">Trenerio profilis nerastas.</p>
      </div>
    );
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ kind: "error", message: "Pasirinkite paveikslėlį." });
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512, 0.85);
      const updated = await updateCoachSelfApi({ photoUrl: dataUrl });
      patchCoach(coach.id, updated);
      push({ kind: "success", message: "Nuotrauka atnaujinta." });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko įkelti nuotraukos.",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoBusy(true);
    try {
      const updated = await updateCoachSelfApi({ photoUrl: "" });
      patchCoach(coach.id, updated);
      push({ kind: "info", message: "Nuotrauka pašalinta." });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko pašalinti nuotraukos.",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const submitSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    const nameTrimmed = name.trim();
    const specialtyTrimmed = specialty.trim();
    const phoneTrimmed = phone.trim();

    if (nameTrimmed.length < 2) {
      setSelfError("Vardas per trumpas.");
      return;
    }

    const coachPatch: {
      name?: string;
      specialty?: string;
      phone?: string;
    } = {};
    if (nameTrimmed !== coach.name) coachPatch.name = nameTrimmed;
    if (specialtyTrimmed !== (coach.specialty ?? ""))
      coachPatch.specialty = specialtyTrimmed;
    if (phoneTrimmed !== (coach.phone ?? "")) coachPatch.phone = phoneTrimmed;

    if (Object.keys(coachPatch).length === 0) {
      push({ kind: "info", message: "Duomenys nepakito." });
      return;
    }

    setSelfBusy(true);
    try {
      const updated = await updateCoachSelfApi(coachPatch);
      patchCoach(coach.id, updated);
      if (coachPatch.name) patchAuthUser({ name: coachPatch.name });
      push({ kind: "success", message: "Profilis atnaujintas." });
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
        eyebrow="Treneris"
        title="Profilis"
        description="Redaguokite savo duomenis, nuotrauką ir slaptažodį."
      />

      <div className="space-y-6">
        <section className="surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                name={coach.name}
                color={coach.avatarColor}
                size="xl"
                photoUrl={coach.photoUrl}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-white text-ink-800 shadow-sm transition-colors hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
                aria-label="Įkelti nuotrauką"
                title="Įkelti nuotrauką"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold">{coach.name}</p>
              <p className="text-sm text-ink-500">
                {authUser?.email ?? ""}
              </p>
              {coach.photoUrl && (
                <button
                  type="button"
                  onClick={handlePhotoRemove}
                  disabled={photoBusy}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800 disabled:opacity-60 dark:hover:text-ink-100"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Pašalinti nuotrauką
                </button>
              )}
            </div>
          </div>
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
                Telefono numerį matys nariai treniruotės puslapyje, kad galėtų
                susisiekti dėl klausimų.
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
              value={authUser?.email ?? ""}
              disabled
              readOnly
              hint="Naudojamas prisijungimui — pakeisti negalima."
              onChange={() => {}}
            />
            <FormField
              label="Telefonas"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+370 6xx xxxxx"
            />
            <FormField
              label="Specializacija"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="pvz. Jėgos treniruotės"
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
