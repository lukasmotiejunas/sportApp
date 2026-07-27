import { Outlet, NavLink } from "react-router-dom";
import clsx from "clsx";
import { LayoutDashboard, Building2, PlusCircle, Sparkles } from "lucide-react";
import { UserMenu } from "../ui/UserMenu";
import { ToastContainer } from "../ui/ToastContainer";
import { BackgroundLogo } from "./BackgroundLogo";

const items = [
  { to: "/superadmin", label: "Suvestinė", icon: LayoutDashboard, end: true },
  { to: "/superadmin/clubs", label: "Klubai", icon: Building2, end: false },
  { to: "/superadmin/clubs/new", label: "Naujas klubas", icon: PlusCircle, end: false },
];

export function SuperAdminLayout() {
  return (
    <div className="relative min-h-screen">
      <BackgroundLogo />
      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white p-4 md:flex md:flex-col dark:border-ink-800 dark:bg-ink-900 md:sticky md:top-0 md:h-screen">
          <div className="mb-6 flex items-center gap-2 px-1 font-display text-lg font-bold text-ink-900 dark:text-lime-400">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-900 text-lime-400">
              <Sparkles className="h-4 w-4" />
            </span>
            Lumo
            <span className="ml-1 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-950">
              Super
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950"
                      : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
                  )
                }
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <UserMenu variant="full" />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85 md:hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-lime-400">
                Lumo
                <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-950">
                  Super
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <UserMenu />
              </div>
            </div>
            <div className="flex gap-1 border-t border-ink-100 p-2 dark:border-ink-800">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold",
                      isActive
                        ? "bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950"
                        : "text-ink-600 hover:bg-ink-100 dark:text-ink-300",
                    )
                  }
                >
                  <it.icon className="h-3.5 w-3.5" />
                  {it.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
