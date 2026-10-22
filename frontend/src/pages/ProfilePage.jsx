import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const path = id ? `/api/employees/${id}` : '/api/employees/me';
  const { data, error, loading } = useApi(path, [path, user.id]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  const e = data.employee;
  return (
    <PageShell title={e.fullName} lede={`${e.employeeCode} · ${e.designation} · ${e.department}`}>
      <div className="grid grid-2">
        <div className="card">
          <h3>Identity</h3>
          <dl className="dl">
            <dt>Employee ID</dt><dd>{e.id}</dd>
            <dt>Email</dt><dd>{e.email}</dd>
            <dt>Phone</dt><dd>{e.phone}</dd>
            <dt>Role</dt><dd>{e.role}</dd>
            <dt>Team Leader</dt><dd>{e.teamLeader || '—'}</dd>
            <dt>Process Manager</dt><dd>{e.processManager || '—'}</dd>
            <dt>Joined</dt><dd>{e.joiningDate}</dd>
            <dt>Location</dt><dd>{e.location}</dd>
            <dt>Status</dt><dd>{e.employmentStatus}</dd>
          </dl>
        </div>
        <div className="card">
          <h3>Compensation</h3>
          {e.salary ? (
            <dl className="dl">
              <dt>Basic</dt><dd>₹{e.salary.basicSalary}</dd>
              <dt>Allowances</dt><dd>₹{e.salary.allowances}</dd>
              <dt>Bank</dt><dd>{e.bank?.bankName} {e.bank?.bankAccount}</dd>
              <dt>IFSC</dt><dd>{e.bank?.ifsc}</dd>
            </dl>
          ) : (
            <p className="lede">Salary is restricted to the employee, HR, Finance, and the process manager.</p>
          )}
          <h3>Documents</h3>
          <DataTable rows={e.documents} rowKey="name" columns={[{ key: 'name', header: 'Document' }, { key: 'status', header: 'Status' }]} />
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Leave</h3>
          <DataTable rows={data.leave.balances} columns={[{ key: 'leaveType', header: 'Type' }, { key: 'balance', header: 'Balance' }]} />
        </div>
        <div className="card">
          <h3>Assets</h3>
          <DataTable rows={data.assets} columns={[{ key: 'assetCode', header: 'Asset' }, { key: 'assetType', header: 'Type' }, { key: 'assignedAt', header: 'Since' }]} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Attendance</h3>
        <DataTable
          rows={data.attendance}
          columns={[
            { key: 'workDate', header: 'Date' },
            { key: 'checkIn', header: 'In' },
            { key: 'checkOut', header: 'Out' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Performance</h3>
          <DataTable rows={data.performance.reviews} columns={[{ key: 'period', header: 'Period' }, { key: 'score', header: 'Score' }, { key: 'managerFeedback', header: 'Feedback' }]} />
        </div>
        <div className="card">
          <h3>Rewards</h3>
          <DataTable rows={data.rewards} columns={[{ key: 'title', header: 'Title' }, { key: 'period', header: 'Period' }, { key: 'points', header: 'Points' }]} />
        </div>
      </div>
    </PageShell>
  );
}
