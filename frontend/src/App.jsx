import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
// import './App.css';
import { Login } from './pages/Login.jsx';
import { DashboardPage } from './pages/dashboards/DashboardPage.jsx';
import { EmployeeDashboard } from './pages/dashboards/EmployeeDashboard.jsx';
import { TeamLeaderDashboard } from './pages/dashboards/TeamLeaderDashboard.jsx';
import { ProcessManagerDashboard } from './pages/dashboards/ProcessManagerDashboard.jsx';
import { HRDashboard } from './pages/dashboards/HRDashboard.jsx';
import { FinanceDashboard } from './pages/dashboards/FinanceDashboard.jsx';
import { ITDashboard } from './pages/dashboards/ITDashboard.jsx';

import { AttendancePage } from './pages/AttendancePage.jsx';
import { EmployeesPage } from './pages/EmployeesPage.jsx';
import { LeavePage } from './pages/LeavePage.jsx';
import { PayrollPage } from './pages/PayrollPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { ReimbursementsPage } from './pages/ReimbursementsPage.jsx';
import { AssetsPage } from './pages/AssetsPage.jsx';
import { GrievancesPage } from './pages/GrievancesPage.jsx';
import { RecognitionPage } from './pages/RecognitionPage.jsx';
import { LearningPage } from './pages/LearningPage.jsx';
import { IncentivesPage } from './pages/IncentivesPage.jsx';
import { PerformancePage } from './pages/PerformancePage.jsx';

import { Layout } from './components/Layout.jsx';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reimbursements" element={<ReimbursementsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/grievances" element={<GrievancesPage />} />
        <Route path="/recognition" element={<RecognitionPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/incentives" element={<IncentivesPage />} />
        <Route path="/performance" element={<PerformancePage />} />

        <Route
          path="/employee-dashboard"
          element={<EmployeeDashboard />}
        />
        <Route
          path="/team-leader-dashboard"
          element={<TeamLeaderDashboard />}
        />
        <Route
          path="/process-manager-dashboard"
          element={<ProcessManagerDashboard />}
        />
        <Route path="/hr-dashboard" element={<HRDashboard />} />
        <Route path="/finance-dashboard" element={<FinanceDashboard />} />
        <Route path="/it-dashboard" element={<ITDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;