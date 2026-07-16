# Pace Club — Running Club Prototype

A polished, mobile-first frontend prototype for a running & sports club management app.
Members can book trainings, follow coach-built plans, track leaderboards, and manage payments.
Coaches can run the club — sessions, plans, results, members, and simulated payments — from one place.

This is a **frontend-only prototype**. There is no backend, no real authentication, and no real
payment processing. All data is seeded locally, kept in a Zustand store, and persisted to
`localStorage` so state survives page reloads.

## Tech

- React 18 + TypeScript + Vite
- Tailwind CSS (with a custom Space Grotesk / Inter type system and a lime accent palette)
- React Router 6
- Zustand (with `persist`) for global state and localStorage persistence
- Lucide React for icons
- Recharts for lightweight data visualisations

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

The app opens on `/select-role`. Enter as:

- **Alex Morgan** — a paid member on the sprint programme.
- **David Park** — a member whose payment is overdue (great for testing the restriction flow).
- **Coach Elena Ruiz** — a coach with full admin access.

You can switch between any member or coach at any point from the demo switcher in the top bar.

## Prototype walkthrough

1. **Alex Morgan** enters the app → dashboard, next training, weekly stats.
2. Open today's Sprint Technique session → cancel / re-register.
3. Open **My Plan** → tick off exercises, add notes.
4. Open the **100 m** leaderboard → podium + Alex's row highlighted.
5. Switch to **David Park** (overdue) → registration is blocked with a red warning banner.
6. Open **Payments** → run the simulated checkout — the modal is clearly labelled *Prototype simulation*.
7. Return to trainings and register successfully.
8. Switch to **Coach Elena** → dashboard with charts and attention list.
9. Open today's session → participant list with payment + attendance controls.
10. Select a participant → open the plan editor → add exercises → **Publish to member**.
11. Open **Leaderboards** → add a new 100 m result → ranking recalculates.
12. Open **Payments** → mark any member paid/overdue → member view updates immediately.

## Data reset

State persists in `localStorage` under key `paceclub-prototype-v1`. To reset the prototype, clear
your browser's local storage for the site or run `localStorage.clear()` in the dev console.

## Notable design decisions

- **Mobile-first by construction.** All primary member flows are tested at 360–430 px widths.
  A bottom navigation drives the member app; the coach view uses a bottom-sheet nav on mobile and
  a sidebar on desktop.
- **Prototype simulation, tastefully labelled.** Only the payment checkout is labelled as a
  simulation — everything else is designed to feel like a production product.
- **Everything is connected.** Registration/cancellation, coach-published plans, leaderboard
  edits, and payment status changes all propagate through a single Zustand store so the demo
  walkthrough works without page reloads.

## File map

```
src/
  App.tsx, main.tsx, index.css
  types/               shared TypeScript types
  data/mockData.ts     seeded members, trainings, plans, leaderboards, payments
  store/useStore.ts    Zustand store + persistence + actions
  utils/               date and formatting helpers
  components/
    layout/            MemberLayout, CoachLayout, PageTitle, MobileBottomNav
    ui/                Buttons, Modal, ConfirmDialog, Toasts, FormFields, etc.
    trainings/         TrainingCard, CapacityProgress, ParticipantAvatarGroup
    leaderboard/       LeaderboardRow, Podium
    dashboard/         DashboardMetricCard
    plans/             ExerciseBlock
    payments/          PaymentStatusBanner
    members/           MemberCard
  pages/
    SelectRole.tsx
    member/            Home, Trainings, TrainingDetail, Plan, Leaderboards, LeaderboardDetail, Payments, Profile
    coach/             Dashboard, Trainings, TrainingForm, TrainingDetail, Members, MemberDetail, PlanEditor, Leaderboards, LeaderboardDetail, Payments
```
