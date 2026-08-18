import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';

import { MemberLayout } from './components/layout/MemberLayout';
import { CoachLayout } from './components/layout/CoachLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { RequireRole } from './components/auth/RequireRole';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Plans from './pages/Plans';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import MemberJoin from './pages/MemberJoin';
import ClubSuspended from './pages/ClubSuspended';
import ImpersonateLanding from './pages/ImpersonateLanding';

import MemberHome from './pages/member/MemberHome';
import MemberTrainings from './pages/member/MemberTrainings';
import MemberTrainingDetail from './pages/member/MemberTrainingDetail';
import MemberLeaderboards from './pages/member/MemberLeaderboards';
import MemberLeaderboardDetail from './pages/member/MemberLeaderboardDetail';
import MemberPayments from './pages/member/MemberPayments';
import MemberProfile from './pages/member/MemberProfile';

// Trainings pages are reused under both /coach/* (coach) and /admin/*
// (admin). They derive their base path from useTrainingsBase().
import CoachTrainings from './pages/coach/CoachTrainings';
import CoachTrainingDetail from './pages/coach/CoachTrainingDetail';
import CoachTrainingForm from './pages/coach/CoachTrainingForm';
import CoachTrainingTemplates from './pages/coach/CoachTrainingTemplates';
import CoachMembers from './pages/coach/CoachMembers';
import CoachMemberDetail from './pages/coach/CoachMemberDetail';
import CoachPlanEditor from './pages/coach/CoachPlanEditor';
import CoachLeaderboards from './pages/coach/CoachLeaderboards';
import CoachLeaderboardDetail from './pages/coach/CoachLeaderboardDetail';
import CoachSchedule from './pages/coach/CoachSchedule';
import CoachProfile from './pages/coach/CoachProfile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPlans from './pages/admin/AdminPlans';
import AdminSubscription from './pages/admin/AdminSubscription';
import AdminProfile from './pages/admin/AdminProfile';
import AdminAddCoach from './pages/admin/AdminAddCoach';

import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminClubDetail from './pages/superadmin/SuperAdminClubDetail';
import SuperAdminFinances from './pages/superadmin/SuperAdminFinances';
import SuperAdminMeetings from './pages/superadmin/SuperAdminMeetings';
import Help from './pages/Help';
import PublicHelp from './pages/PublicHelp';
import ClubChat from './pages/ClubChat';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Analytics() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname]);
  return null;
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
        <p className="text-sm text-white/70">Kraunama…</p>
      </div>
    </div>
  );
}

export default function App() {
  const authChecked = useStore((s) => s.authChecked);
  const authUser = useStore((s) => s.authUser);
  const subscriptionStatus = useStore((s) => s.subscriptionStatus);
  const bootstrap = useStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!authChecked) {
    return <LoadingScreen />;
  }

  const home = !authUser
    ? '/login'
    : authUser.role === 'super_admin'
      ? '/superadmin'
      : authUser.role === 'admin'
        ? '/admin'
        : authUser.role === 'coach'
          ? '/coach'
          : '/member';

  // Club is suspended (unpaid/cancelled). Admins can still reach
  // /admin/subscription to fix billing; everyone else sees the suspension
  // screen for any route.
  const suspended =
    !!authUser &&
    authUser.role !== 'super_admin' &&
    (subscriptionStatus === 'past_due' || subscriptionStatus === 'cancelled');

  if (suspended) {
    const isAdmin = authUser.role === 'admin';
    return (
      <>
        <ScrollToTop />
        <Analytics />
        <Routes>
          <Route path="/plans" element={<Plans />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/join/:slug" element={<MemberJoin />} />
          <Route path="/help" element={<PublicHelp />} />
          {isAdmin && (
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route path="subscription" element={<AdminSubscription />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>
          )}
          <Route path="*" element={<ClubSuspended />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Analytics />
      <Routes>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route
          path="/login"
          element={authUser ? <Navigate to={home} replace /> : <Login />}
        />
        <Route path="/impersonate" element={<ImpersonateLanding />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/join/:slug" element={<MemberJoin />} />
        <Route path="/help" element={<PublicHelp />} />

        <Route
          path="/member"
          element={
            <RequireRole roles={['member']}>
              <MemberLayout />
            </RequireRole>
          }
        >
          <Route index element={<MemberHome />} />
          <Route path="trainings" element={<MemberTrainings />} />
          <Route path="trainings/:id" element={<MemberTrainingDetail />} />
          <Route path="leaderboards" element={<MemberLeaderboards />} />
          <Route path="leaderboards/:id" element={<MemberLeaderboardDetail />} />
          <Route path="payments" element={<MemberPayments />} />
          <Route path="chat" element={<ClubChat />} />
          <Route path="profile" element={<MemberProfile />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route
          path="/coach"
          element={
            <RequireRole roles={['coach']}>
              <CoachLayout />
            </RequireRole>
          }
        >
          <Route index element={<CoachTrainings />} />
          <Route path="trainings" element={<CoachTrainings />} />
          <Route path="trainings/new" element={<CoachTrainingForm mode="create" />} />
          <Route path="trainings/:id" element={<CoachTrainingDetail />} />
          <Route path="trainings/:id/edit" element={<CoachTrainingForm mode="edit" />} />
          <Route path="training-templates" element={<CoachTrainingTemplates />} />
          <Route path="members" element={<CoachMembers />} />
          <Route path="members/:id" element={<CoachMemberDetail />} />
          <Route path="plans/:trainingId/:memberId" element={<CoachPlanEditor />} />
          <Route path="leaderboards" element={<CoachLeaderboards />} />
          <Route path="leaderboards/:id" element={<CoachLeaderboardDetail />} />
          <Route path="schedule" element={<CoachSchedule />} />
          <Route path="chat" element={<ClubChat />} />
          <Route path="profile" element={<CoachProfile />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="trainings" element={<CoachTrainings />} />
          <Route path="trainings/new" element={<CoachTrainingForm mode="create" />} />
          <Route path="trainings/:id" element={<CoachTrainingDetail />} />
          <Route path="trainings/:id/edit" element={<CoachTrainingForm mode="edit" />} />
          <Route path="training-templates" element={<CoachTrainingTemplates />} />
          <Route
            path="trainings/:trainingId/plans/:memberId"
            element={<CoachPlanEditor />}
          />
          <Route path="leaderboards" element={<CoachLeaderboards />} />
          <Route path="leaderboards/:id" element={<CoachLeaderboardDetail />} />
          <Route path="chat" element={<ClubChat />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="subscription" element={<AdminSubscription />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="coaches/new" element={<AdminAddCoach />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route
          path="/superadmin"
          element={
            <RequireRole roles={['super_admin']}>
              <SuperAdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/superadmin/clubs" replace />} />
          <Route path="clubs" element={<SuperAdminDashboard />} />
          <Route path="clubs/:id" element={<SuperAdminClubDetail />} />
          <Route path="finances" element={<SuperAdminFinances />} />
          <Route path="meetings" element={<SuperAdminMeetings />} />
        </Route>

        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </>
  );
}
