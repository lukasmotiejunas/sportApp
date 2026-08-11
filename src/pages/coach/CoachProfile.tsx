import { useEffect, useRef, useState } from "react";
import { Camera, KeyRound, Trash2, User } from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const [runTour, setRunTour] = useState(false);
  const authUserId = authUser?.id ?? "";
  const tourStorageKey = `coach_profile_tour_seen:${authUserId || "anon"}`;

  useEffect(() => {
    setName(coach?.name ?? "");
    setSpecialty(coach?.specialty ?? "");
    setPhone(coach?.phone ?? "");
  }, [coach?.name, coach?.specialty, coach?.phone]);

  useEffect(() => {
    if (!coach) return;
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach]);

  if (!coach) {
    return (
      <div>
        <PageTitle title={t("coach_profile.title")} eyebrow={t("coach_profile.eyebrow")} />
        <p className="text-sm text-ink-500">{t("coach_profile.not_found")}</p>
      </div>
    );
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ kind: "error", message: t("coach_profile.photo_type_error") });
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512, 0.85);
      const updated = await updateCoachSelfApi({ photoUrl: dataUrl });
      patchCoach(coach.id, updated);
      push({ kind: "success", message: t("coach_profile.photo_updated") });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : t("coach_profile.photo_error"),
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
      push({ kind: "info", message: t("coach_profile.photo_removed") });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : t("coach_profile.photo_remove_error"),
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
      setSelfError(t("coach_profile.error_name_short"));
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
      push({ kind: "info", message: t("coach_profile.data_unchanged") });
      return;
    }

    setSelfBusy(true);
    try {
      const updated = await updateCoachSelfApi(coachPatch);
      patchCoach(coach.id, updated);
      if (coachPatch.name) patchAuthUser({ name: coachPatch.name });
      push({ kind: "success", message: t("coach_profile.profile_updated") });
    } catch (err) {
      setSelfError(
        err instanceof ApiError ? err.message : t("coach_profile.error_update"),
      );
    } finally {
      setSelfBusy(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError(t("coach_profile.error_pw_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("coach_profile.error_pw_mismatch"));
      return;
    }
    setPwBusy(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      push({ kind: "success", message: t("coach_profile.password_changed") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof ApiError
          ? err.message
          : t("coach_profile.error_pw_change"),
      );
    } finally {
      setPwBusy(false);
    }
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Profilis — čia atnaujinate savo duomenis, nuotrauką ir slaptažodį. Kai kurie duomenys matomi nariams treniruočių puslapiuose.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="photo"]',
      content:
        "Nuotrauka. Paspauskite fotoaparato ikoną prie avataro, kad įkeltumėte savo nuotrauką — ji atsiras jūsų vestose treniruotėse ir dalyvių sąrašuose. Rekomenduojama kvadratinė nuotrauka.",
    },
    {
      target: '[data-tour="personal-info"]',
      content:
        "Jūsų duomenys. Vardas ir pavardė — kaip jus matys nariai. El. paštas naudojamas prisijungimui ir yra nekeičiamas. Telefono numeris — matomas nariams treniruotės puslapyje, kad galėtų su jumis susisiekti. Specializacija — trumpai apie jūsų sritį (pvz. „Sprintas ir technika").",
    },
    {
      target: '[data-tour="password"]',
      content:
        "Slaptažodžio keitimas. Norėdami pakeisti — pirma įveskite dabartinį, po to du kartus naują (bent 6 simboliai). Rekomenduojama keisti retkarčiais saugumui.",
      placement: "top",
    },
  ];

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
          back: t("joyride.back"),
          close: t("joyride.close"),
          last: t("joyride.last"),
          next: t("joyride.next"),
          skip: t("joyride.skip"),
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
          eyebrow={t("coach_profile.eyebrow")}
          title={t("coach_profile.title")}
          description={t("coach_profile.description")}
        />
      </div>

      <div className="space-y-6">
        <section className="surface p-5" data-tour="photo">
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
                aria-label={t("coach_profile.upload_photo_aria")}
                title={t("coach_profile.upload_photo_aria")}
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
                  <Trash2 className="h-3.5 w-3.5" /> {t("coach_profile.remove_photo")}
                </button>
              )}
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
                {t("coach_profile.personal_info_title")}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {t("coach_profile.personal_info_desc")}
              </p>
            </div>
          </div>
          <form onSubmit={submitSelf} className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t("coach_profile.name_label")}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("coach_profile.name_placeholder")}
            />
            <FormField
              label={t("coach_profile.email_label")}
              type="email"
              value={authUser?.email ?? ""}
              disabled
              readOnly
              hint={t("coach_profile.email_hint")}
              onChange={() => {}}
            />
            <FormField
              label={t("coach_profile.phone_label")}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("coach_profile.phone_placeholder")}
            />
            <FormField
              label={t("coach_profile.specialty_label")}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder={t("coach_profile.specialty_placeholder")}
            />
            {selfError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                {selfError}
              </div>
            )}
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={selfBusy}>
                {selfBusy ? t("coach_profile.saving") : t("coach_profile.save")}
              </button>
            </div>
          </form>
        </section>

        <section className="surface p-5" data-tour="password">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
                {t("coach_profile.password_title")}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">
                {t("coach_profile.password_desc")}
              </p>
            </div>
          </div>
          <form onSubmit={submitPassword} className="space-y-4">
            <FormField
              label={t("coach_profile.current_password")}
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("coach_profile.new_password")}
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("coach_profile.new_password_placeholder")}
              />
              <FormField
                label={t("coach_profile.confirm_password_label")}
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("coach_profile.new_password_placeholder")}
              />
            </div>
            {pwError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {pwError}
              </div>
            )}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={pwBusy}>
                {pwBusy ? t("coach_profile.changing_pw") : t("coach_profile.change_pw_btn")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
