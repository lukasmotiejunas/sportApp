import { Bell } from "lucide-react";
import { Outlet } from "react-router-dom";
import { DemoSwitcher } from "../ui/DemoSwitcher";
import { MobileBottomNav } from "./MobileBottomNav";
import { ToastContainer } from "../ui/ToastContainer";

export function MemberLayout() {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-lime-400">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-900 text-lime-400">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            </span>
            Volvere Club
          </div>
          <div className="ml-auto flex items-center gap-2">
            <DemoSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-4 md:pb-8">
        <Outlet />
      </main>

      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
}
