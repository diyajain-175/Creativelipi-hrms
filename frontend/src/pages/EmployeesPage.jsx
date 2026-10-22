import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';
import { StatusBadge } from '../components/StatusBadge.jsx';

export function EmployeesPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/api/employees', [user.id]);
  const lookups = useApi('/api/lookups', []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee',
    departmentId: 'dept-creative',
    designationId: 'des-associate',
    teamLeaderId: 'EMP-2001',
    processManagerId: 'EMP-3001',
    basicSalary: 30000,
    allowances: 7000,
  });
  const [msg, setMsg] = useState('');
  const canWrite = user.permissions.includes('employees.write');

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/api/employees', form);
      setOpen(false);
      setMsg('Employee created. Default password is password123.');
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <PageShell
      title="Employees"
      lede="Directory is limited to people you are allowed to see."
      actions={canWrite ? <button className="btn" onClick={() => setOpen(true)}>Add employee</button> : null}
    >
      {msg ? <p>{msg}</p> : null}
      <div className="card">
        <DataTable
          rows={data}
          columns={[
            { key: 'employeeCode', header: 'ID' },
            { key: 'fullName', header: 'Name', render: (r) => <Link to={`/employees/${r.id}`}>{r.fullName}</Link> },
            { key: 'department', header: 'Department' },
            { key: 'designation', header: 'Designation' },
            { key: 'role', header: 'Role' },
            { key: 'employmentStatus', header: 'Status', render: (r) => <StatusBadge value={r.employmentStatus} /> },
          ]}
        />
      </div>
      {open ? (
        <Modal title="New employee" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={create}>
            <label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></label>
            <label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="employee">Employee</option>
                <option value="team_leader">Team Leader</option>
                <option value="process_manager">Process Manager</option>
                <option value="hr_admin">HR Admin</option>
                <option value="finance">Finance</option>
                <option value="it_admin">IT Admin</option>
              </select>
            </label>
            <label>
              Department
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                {(lookups.data?.departments || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button className="btn" type="submit">Create</button>
              <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
