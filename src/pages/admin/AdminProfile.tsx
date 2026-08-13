import { useEffect, useRef, useState } from "react";
import { Bell, Building2, ImageIcon, KeyRound, Trash2, Upload, User } from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { ApiError } from "../../api/client";
import {
  changePasswordApi,
  getNotificationSettingsApi,
  updateClubApi,
  updateNotificationSettingsApi,
  updateSelfApi,
  type NotificationSettings,
} from "../../api/profile";
import { LITHUANIAN_CITIES } from "../../utils/lithuanianCities";
import { resizeImageToDataUrl } from "../../utils/image";

export default function AdminProfile() {
  const authUser = useStore((s) => s.authUser);
  const patchAuthUser = useStore((s) => s.patchAuthUser);
  const push = useStore((s) => s.pushToast);

  // Club section
  const [clubName, setClubName] = useState(authUser?.clubName ?? "");
  const [clubCity, setClubCity] = useState(authUser?.clubCity ?? "");
  const [clubAddress, setClubAddress] = useState(authUser?.clubAddress ?? "");
  const [clubBusy, setClubBusy] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);

  // Personal info section
  const [name, setName] = useState(authUser?.name ?? "");
  const [selfBusy, setSelfBusy] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  // Password section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    notifyNewMember: false,
    notifyNewTraining: false,
    notifyPayment: false,
  });
  const [notifBusy, setNotifBusy] = useState(false);

  // Logo section
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const currentLogo = authUser?.clubLogo ?? null;

  const authUserId = authUser?.id ?? "";
  const [runTour, setRunTour] = useState(false);

  // Re-sync local state when authUser refreshes (e.g. after bootstrap).
  useEffect(() => {
    setClubName(authUser?.clubName ?? "");
    setName(authUser?.name ?? "");
  }, [authUser]);

  useEffect(() => {
    getNotificationSettingsApi().then(setNotifications).catch(() => {});
  }, []);

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
      const updated = await updateClubApi({
        name: trimmed,
        city: clubCity || null,
        country: 'LT',
        address: clubAddress.trim() || null,
      });
      patchAuthUser({
        clubName: updated.name,
        clubCity: updated.city,
        clubAddress: updated.address,
      });
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
    if (nameTrimmed.length < 2) {
      setSelfError("Vardas per trumpas.");
      return;
    }

    if (nameTrimmed === (authUser?.name ?? "")) {
      push({ kind: "info", message: "Duomenys nepakito." });
      return;
    }

    setSelfBusy(true);
    try {
      const updated = await updateSelfApi({ name: nameTrimmed });
      patchAuthUser({ name: updated.name });
      push({ kind: "success", message: "Jūsų duomenys atnaujinti." });
    } catch (err) {
      setSelfError(
        err instanceof ApiError ? err.message : "Nepavyko atnaujinti.",
      );
    } finally {
      setSelfBusy(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ kind: "error", message: "Pasirinkite paveikslėlį." });
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512, 0.9);
      const updated = await updateClubApi({ logoUrl: dataUrl });
      patchAuthUser({ clubLogo: updated.logoUrl });
      push({ kind: "success", message: "Klubo logotipas atnaujintas." });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko įkelti logotipo.",
      });
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    setLogoBusy(true);
    try {
      const updated = await updateClubApi({ logoUrl: null });
      patchAuthUser({ clubLogo: updated.logoUrl });
      push({ kind: "info", message: "Logotipas pašalintas." });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko pašalinti logotipo.",
      });
    } finally {
      setLogoBusy(false);
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

  const toggleNotification = async (key: keyof NotificationSettings) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    setNotifBusy(true);
    try {
      const updated = await updateNotificationSettingsApi({ [key]: next[key] });
      setNotifications(updated);
      push({ kind: "success", message: "Pranešimų nustatymai išsaugoti." });
    } catch {
      setNotifications(notifications);
      push({ kind: "error", message: "Nepavyko išsaugoti nustatymų." });
    } finally {
      setNotifBusy(false);
    }
  };

  const tourStorageKey = `admin_profile_tour_seen:${authUserId || "anon"}`;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Profilis — čia atnaujinate klubo informaciją, savo duomenis ir keičiate slaptažodį.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="club-info"]',
      content:
        "Klubo informacija. Klubo pavadinimą matys nariai, treneriai ir jis figūruos siunčiamose sąskaitose. Pakeisti galima bet kada — pakeitimas iškart taikomas visiems.",
    },
    {
      target: '[data-tour="club-logo"]',
      content:
        "Klubo logotipas. Įkelkite savo klubo logo — jis taps fonu visiems klubo nariams, treneriams ir administratoriams. Jei nekelsite, bus rodomas numatytas Lumo logotipas. Rekomenduojamas kvadratinis formatas.",
    },
    {
      target: '[data-tour="personal-info"]',
      content:
        "Jūsų duomenys. Čia matote ir keičiate savo vardą. El. paštas naudojamas prisijungimui ir yra nekeičiamas.",
    },
    {
      target: '[data-tour="notifications"]',
      content:
        "El. pašto pranešimai. Įjunkite norimus pranešimus — gausite laišką, kai bus pridėtas naujas narys, sukurta treniruotė arba gautas mokėjimas. Kiekvienas pranešimas įjungiamas atskirai.",
      placement: "top",
    },
    {
      target: '[data-tour="password"]',
      content:
        "Slaptažodžio keitimas. Norėdami pakeisti — pirma įveskite dabartinį, po to du kartus naują (bent 6 simboliai). Rekomenduojama keisti retkarčiais saugumui.",
      placement: "top",
    },
  ];

  useEffect(() => {
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, "1");
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="max-w-3xl">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableScrolling={false}
        callback={handleTourCallback}
        locale={{
          back: "Atgal",
          close: "Uždaryti",
          last: "Baigti",
          next: "Toliau",
          skip: "Praleisti",
        }}
        styles={{
          options: {
            primaryColor: "#5da004",
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          eyebrow="Administratorius"
          title="Profilis"
          description="Redaguokite klubo informaciją, savo duomenis ir keiskite slaptažodį."
        />
      </div>

      <div className="space-y-6">
        <section className="surface p-5" data-tour="club-info">
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
              placeholder="pvz. Lumo Vilnius"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Šalis</label>
                <select
                  disabled
                  className="input cursor-not-allowed opacity-60"
                  value="LT"
                >
                  <option value="LT">Lietuva</option>
                </select>
              </div>
              <div>
                <label className="label">Miestas</label>
                <select
                  className="input"
                  value={clubCity}
                  onChange={(e) => setClubCity(e.target.value)}
                >
                  <option value="">— Pasirinkite miestą —</option>
                  {LITHUANIAN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FormField
              label="Adresas"
              value={clubAddress}
              onChange={(e) => setClubAddress(e.target.value)}
              placeholder="pvz. Sporto g. 1, LT-01234"
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

          <div
            className="mt-6 border-t border-ink-100 pt-6 dark:border-ink-800"
            data-tour="club-logo"
          >
            <label className="label mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-ink-500" />
              Klubo logotipas
            </label>
            <p className="mb-4 text-xs text-ink-500">
              Įkeltas logotipas atsiras kaip fonas visiems klubo nariams, treneriams ir administratoriams.
              Jei nekelsite, bus rodomas Lumo logotipas.
            </p>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-800">
                {currentLogo ? (
                  <img
                    src={currentLogo}
                    alt="Klubo logotipas"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-ink-400" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={logoBusy}
                  className="btn-outline h-10 px-4 text-sm"
                >
                  <Upload className="h-4 w-4" />
                  {logoBusy ? "Įkeliama…" : currentLogo ? "Pakeisti" : "Įkelti logotipą"}
                </button>
                {currentLogo && (
                  <button
                    type="button"
                    onClick={handleLogoRemove}
                    disabled={logoBusy}
                    className="btn-ghost h-10 px-3 text-sm text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Pašalinti
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="surface p-5" data-tour="personal-info">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                Jūsų duomenys
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                El. paštas naudojamas prisijungimui ir yra nekeičiamas.
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

        <section className="surface p-5" data-tour="notifications">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                El. pašto pranešimai
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                Pranešimai siunčiami į jūsų prisijungimo el. paštą.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {(
              [
                { key: "notifyNewMember", label: "Naujas narys užregistruotas" },
                { key: "notifyNewTraining", label: "Nauja treniruotė sukurta" },
                { key: "notifyPayment", label: "Gautas mokėjimas iš nario" },
              ] as { key: keyof NotificationSettings; label: string }[]
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink-100 px-4 py-3 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/50"
              >
                <span className="text-sm font-medium text-ink-800 dark:text-ink-200">
                  {label}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications[key]}
                  disabled={notifBusy}
                  onClick={() => toggleNotification(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                    notifications[key] ? "bg-lime-500" : "bg-ink-200 dark:bg-ink-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      notifications[key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </section>

        <section className="surface p-5" data-tour="password">
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
