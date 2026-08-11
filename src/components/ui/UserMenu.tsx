import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useStore } from "../../store/useStore";
import { Avatar } from "./Avatar";

type Props = {
  variant?: "compact" | "full";
};

export function UserMenu({ variant = "compact" }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useStore((s) => s.authUser);
  const logout = useStore((s) => s.logout);
  const memberPhotoUrl = useStore((s) => {
    if (s.authUser?.role !== "member") return undefined;
    const email = s.authUser.email?.toLowerCase();
    return s.members.find((m) => m.email.toLowerCase() === email)?.photoUrl;
  });

  const name = authUser?.name ?? authUser?.email ?? "—";
  const label = authUser ? t(`roles.${authUser.role}`) : "";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (variant === "full") {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="md" photoUrl={memberPhotoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
              {name}
            </p>
            <p className="truncate text-xs uppercase tracking-wide text-ink-500">
              {label}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="btn-outline mt-3 h-9 w-full text-sm"
        >
          <LogOut className="h-4 w-4" /> {t("common.logout")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="max-w-[10rem] truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
          {name}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      </div>
      <Avatar name={name} size="sm" photoUrl={memberPhotoUrl} />
      <button
        type="button"
        onClick={handleLogout}
        className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
        aria-label={t("common.logout")}
        title={t("common.logout")}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
