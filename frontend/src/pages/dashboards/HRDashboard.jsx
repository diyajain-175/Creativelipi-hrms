import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/MetricCard.jsx';

export function HRDashboard({ data }) {
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Organization-wide HR control. Create people, policies, and reviews from the modules.</p>
      <div className="grid grid-4">
        <MetricCard label="Employees" value={data.totalEmployees} hint={`${data.active} active`} />
        <MetricCard label="New this month" value={data.newEmployees} />
        <MetricCard label="Open leave" value={data.pendingLeave} />
        <MetricCard label="Open grievances" value={data.grievances} />
      </div>
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <MetricCard label="Learning records" value={data.learning} />
        <MetricCard label="Recognition" value={data.rewards} />
        <MetricCard label="Payroll still open" value={data.payrollOpen} />
      </div>
      <div className="quick">
        <Link className="btn" to="/employees">Manage employees</Link>
        <Link className="btn secondary" to="/settings">Policies</Link>
        <Link className="btn secondary" to="/reports">Reports</Link>
      </div>
    </div>
  );
}
