import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/MetricCard.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function ProcessManagerDashboard({ data }) {
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Approvals waiting at process level across your teams.</p>
      <div className="grid grid-4">
        <MetricCard label="Process headcount" value={data.employeeCount} />
        <MetricCard label="Present" value={data.present} />
        <MetricCard label="Pending leave" value={data.pendingLeave?.length || 0} />
        <MetricCard label="Incentives" value={data.pendingIncentives?.length || 0} />
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="profile-head">
            <h3>Leave approvals</h3>
            <Link to="/leave">Open</Link>
          </div>
          <DataTable
            rows={data.pendingLeave}
            columns={[
              { key: 'employeeName', header: 'Employee' },
              { key: 'leaveTypeName', header: 'Type' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            ]}
          />
        </div>
        <div className="card">
          <h3>Incentive recommendations</h3>
          <DataTable
            rows={data.pendingIncentives}
            columns={[
              { key: 'employeeName', header: 'Employee' },
              { key: 'amount', header: 'Amount' },
              { key: 'reason', header: 'Reason' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
