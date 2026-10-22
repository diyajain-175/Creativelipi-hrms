import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/MetricCard.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { api } from '../../api/client.js';
import { DataTable } from '../../components/DataTable.jsx';

export function EmployeeDashboard({ data, onRefresh }) {
  const att = data.attendance;
  async function punch(kind) {
    await api.post(`/api/attendance/${kind}`, {});
    onRefresh();
  }
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Your day at CreativeLipi. Only your own records are shown here.</p>
      <div className="quick">
        <Link className="btn" to="/leave">Apply leave</Link>
        <Link className="btn secondary" to="/attendance">View attendance</Link>
        <Link className="btn secondary" to="/payroll">View payroll</Link>
        <Link className="btn secondary" to="/profile">View profile</Link>
        <Link className="btn secondary" to="/grievances">Raise grievance</Link>
        <Link className="btn secondary" to="/reimbursements">Submit reimbursement</Link>
        <Link className="btn secondary" to="/assets">View assets</Link>
        <Link className="btn secondary" to="/learning">View learning</Link>
      </div>
      <div className="grid grid-4">
        <MetricCard
          label="Today"
          value={att?.status ? att.status : 'Not marked'}
          hint={att?.checkIn ? `In ${att.checkIn}${att.checkOut ? ` · Out ${att.checkOut}` : ''}` : 'Check in when you start'}
        />
        <MetricCard label="Casual leave" value={data.leaveBalances?.find((b) => b.leaveType === 'casual')?.balance ?? '—'} />
        <MetricCard label="Latest net pay" value={data.payrollSummary ? `₹${data.payrollSummary.net}` : '—'} hint={data.payrollSummary?.period} />
        <MetricCard label="Assets" value={data.assets?.length || 0} />
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Attendance</h3>
          <div className="actions">
            <button className="btn" onClick={() => punch('check-in')}>Check in</button>
            <button className="btn secondary" onClick={() => punch('check-out')}>Check out</button>
          </div>
        </div>
        <div className="card">
          <h3>Profile</h3>
          <p>{data.profile.fullName} · {data.profile.designation}</p>
          <p className="lede">{data.profile.department} · reports to {data.profile.teamLeader}</p>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Pending leave</h3>
          <DataTable
            rows={data.pendingLeave}
            columns={[
              { key: 'leaveTypeName', header: 'Type' },
              { key: 'startDate', header: 'From' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            ]}
          />
        </div>
        <div className="card">
          <h3>Notifications</h3>
          <DataTable
            rows={data.notifications}
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'body', header: 'Detail' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
