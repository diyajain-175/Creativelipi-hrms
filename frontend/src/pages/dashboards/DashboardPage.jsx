import { useAuth } from '../../auth/AuthContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { LoadingState } from '../../components/LoadingState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { EmployeeDashboard } from './EmployeeDashboard.jsx';
import { TeamLeaderDashboard } from './TeamLeaderDashboard.jsx';
import { ProcessManagerDashboard } from './ProcessManagerDashboard.jsx';
import { HRDashboard } from './HRDashboard.jsx';
import { FinanceDashboard } from './FinanceDashboard.jsx';
import { ITDashboard } from './ITDashboard.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/api/dashboard', [user.id]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const map = {
    employee: EmployeeDashboard,
    team_leader: TeamLeaderDashboard,
    process_manager: ProcessManagerDashboard,
    hr_admin: HRDashboard,
    finance: FinanceDashboard,
    it_admin: ITDashboard,
  };
  const View = map[data.kind] || EmployeeDashboard;
  return <View data={data} onRefresh={reload} />;
}
