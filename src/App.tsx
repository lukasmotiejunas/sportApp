import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import { MemberLayout } from './components/layout/MemberLayout';
import { CoachLayout } from './components/layout/CoachLayout';
import SelectRole from './pages/SelectRole';

import MemberHome from './pages/member/MemberHome';
import MemberTrainings from './pages/member/MemberTrainings';
import MemberTrainingDetail from './pages/member/MemberTrainingDetail';
import MemberPlan from './pages/member/MemberPlan';
import MemberLeaderboards from './pages/member/MemberLeaderboards';
import MemberLeaderboardDetail from './pages/member/MemberLeaderboardDetail';
import MemberPayments from './pages/member/MemberPayments';
import MemberProfile from './pages/member/MemberProfile';

import CoachDashboard from './pages/coach/CoachDashboard';
import CoachTrainings from './pages/coach/CoachTrainings';
import CoachTrainingDetail from './pages/coach/CoachTrainingDetail';
import CoachTrainingForm from './pages/coach/CoachTrainingForm';
import CoachMembers from './pages/coach/CoachMembers';
import CoachMemberDetail from './pages/coach/CoachMemberDetail';
import CoachPlanEditor from './pages/coach/CoachPlanEditor';
import CoachLeaderboards from './pages/coach/CoachLeaderboards';
import CoachLeaderboardDetail from './pages/coach/CoachLeaderboardDetail';
import CoachPayments from './pages/coach/CoachPayments';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const role = useStore((s) => s.role);
  const darkMode = useStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to={role ? (role === 'coach' ? '/coach' : '/member') : '/select-role'} replace />} />
        <Route path="/login" element={<Navigate to="/select-role" replace />} />
        <Route path="/select-role" element={<SelectRole />} />

        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<MemberHome />} />
          <Route path="trainings" element={<MemberTrainings />} />
          <Route path="trainings/:id" element={<MemberTrainingDetail />} />
          <Route path="plan" element={<MemberPlan />} />
          <Route path="leaderboards" element={<MemberLeaderboards />} />
          <Route path="leaderboards/:id" element={<MemberLeaderboardDetail />} />
          <Route path="payments" element={<MemberPayments />} />
          <Route path="profile" element={<MemberProfile />} />
        </Route>

        <Route path="/coach" element={<CoachLayout />}>
          <Route index element={<CoachDashboard />} />
          <Route path="trainings" element={<CoachTrainings />} />
          <Route path="trainings/new" element={<CoachTrainingForm mode="create" />} />
          <Route path="trainings/:id" element={<CoachTrainingDetail />} />
          <Route path="trainings/:id/edit" element={<CoachTrainingForm mode="edit" />} />
          <Route path="members" element={<CoachMembers />} />
          <Route path="members/:id" element={<CoachMemberDetail />} />
          <Route path="plans/:trainingId/:memberId" element={<CoachPlanEditor />} />
          <Route path="leaderboards" element={<CoachLeaderboards />} />
          <Route path="leaderboards/:id" element={<CoachLeaderboardDetail />} />
          <Route path="payments" element={<CoachPayments />} />
        </Route>

        <Route path="*" element={<Navigate to="/select-role" replace />} />
      </Routes>
    </>
  );
}
