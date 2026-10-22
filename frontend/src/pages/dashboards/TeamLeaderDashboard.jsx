import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/MetricCard.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function TeamLeaderDashboard({ data }) {
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Only people in your team. Other teams are hidden.</p>
      <div className="grid grid-4">
        <MetricCard label="Team size" value={data.teamSize} />
        <MetricCard label="Present" value={data.present} />
        <MetricCard label="Absent" value={data.absent} />
        <MetricCard label="On leave" value={data.onLeave} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="profile-head">
          <h3>Pending leave</h3>
          <Link to="/leave">Review</Link>
        </div>
        <DataTable
          rows={data.pendingLeave}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'leaveTypeName', header: 'Type' },
            { key: 'startDate', header: 'From' },
            { key: 'endDate', header: 'To' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Team</h3>
        <DataTable
          rows={data.people}
          columns={[
            { key: 'fullName', header: 'Name', render: (r) => <Link to={`/employees/${r.id}`}>{r.fullName}</Link> },
            { key: 'designation', header: 'Designation' },
            { key: 'employmentStatus', header: 'Status' },
          ]}
        />
      </div>
    </div>
  );
}
