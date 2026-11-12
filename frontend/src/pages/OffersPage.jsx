import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { api, fetchBlob } from '../api/client.js';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'process_manager', label: 'Process Manager' },
  { value: 'finance', label: 'Finance' },
  { value: 'it_admin', label: 'IT Admin' },
];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'employee',
  departmentId: '',
  designationId: '',
  location: '',
  joiningDate: '',
  basicSalary: '',
  allowances: '',
  teamLeaderId: '',
  processManagerId: '',
};

const rupees = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

function OfferModal({ onClose, onDone }) {
  const lookups = useApi('/api/lookups', []);
  const employees = useApi('/api/employees', []);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const teamLeaders = (employees.data || []).filter((e) => e.role === 'team_leader');
  const processManagers = (employees.data || []).filter((e) => e.role === 'process_manager');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/offers', form);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="New offer letter" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          First name
          <input value={form.firstName} onChange={set('firstName')} required />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={set('lastName')} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={set('phone')} />
        </label>
        <label>
          Role
          <select value={form.role} onChange={set('role')}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
        <label>
          Department
          <select value={form.departmentId} onChange={set('departmentId')} required>
            <option value="">Select department</option>
            {(lookups.data?.departments || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label>
          Designation
          <select value={form.designationId} onChange={set('designationId')} required>
            <option value="">Select designation</option>
            {(lookups.data?.designations || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label>
          Work location
          <input value={form.location} onChange={set('location')} />
        </label>
        <label>
          Joining date
          <input type="date" value={form.joiningDate} onChange={set('joiningDate')} required />
        </label>
        <label>
          Basic salary (monthly, ₹)
          <input type="number" min="1" value={form.basicSalary} onChange={set('basicSalary')} required />
        </label>
        <label>
          Allowances (monthly, ₹)
          <input type="number" min="0" value={form.allowances} onChange={set('allowances')} />
        </label>
        <label>
          Reporting Team Leader
          <select value={form.teamLeaderId} onChange={set('teamLeaderId')}>
            <option value="">None</option>
            {teamLeaders.map((t) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        </label>
        <label>
          Reporting Process Manager
          <select value={form.processManagerId} onChange={set('processManagerId')}>
            <option value="">None</option>
            {processManagers.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Save offer</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = `Email: ${creds.loginEmail}\nTemporary password: ${creds.temporaryPassword}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      alert('Copy not allowed by the browser. Please copy it manually.');
    }
  }

  return (
    <Modal title="Login details" onClose={onClose}>
      <div className="form">
        <p>
          Dashboard login for <strong>{creds.name}</strong> ({creds.employeeCode}) is ready.
          Share these details with the employee.
        </p>
        <p>
          <strong>Email:</strong> {creds.loginEmail}
        </p>
        <p>
          <strong>Temporary password:</strong>{' '}
          <code style={{ fontSize: 18 }}>{creds.temporaryPassword}</code>
        </p>
        <p className="error">
          Passwords are stored in a secure (hashed) form, so this password cannot be shown again
          after you close this window. If you need it again, use "Show /reset login" to generate a new temporary
          password. The employee will be asked to set a new password at the next login. 
        </p>
        <div className="actions">
          <button className="btn" type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy details'}
          </button>
          <button className="btn secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function OffersPage() {
  const { user } = useAuth();
  const list = useApi('/api/offers', [user.id]);
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState(null);

  async function viewLetter(offer) {
    const win = window.open('', '_blank');

    try {
      const blob = await fetchBlob(`/api/offers/${offer.id}/pdf`);
      win.location = URL.createObjectURL(blob);
    } catch (err) {
      win?.close();
      alert(err.message);
    }
  }

  async function downloadLetter(offer) {
    try {
      const blob = await fetchBlob(`/api/offers/${offer.id}/pdf`);
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Offer-Letter-${offer.firstName}-${offer.lastName}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  }

  async function createLogin(offer) {
    const ok = window.confirm(
      `Create dashboard login for ${offer.firstName} ${offer.lastName}?`
    );

    if (!ok) return;

    try {
      const data = await api.post(`/api/offers/${offer.id}/create-login`, {});
      setCreds(data);
      list.reload();
    } catch (err) {
      alert(err.message);
    }
  }
    async function resetLogin(offer) {
    const ok = window.confirm(
      `Generate a new temporary password for ${offer.firstName} ${offer.lastName}? The old password will stop working.`
    );

    if (!ok) return;

    try {
      const data = await api.post(`/api/offers/${offer.id}/reset-login`, {});
      setCreds(data);
    } catch (err) {
      alert(err.message);
    }
  }

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  return (
    <PageShell
      title="Offer Letters"
      lede="Create offer letters for new joiners, then give them a dashboard login."
      actions={<button className="btn" onClick={() => setOpen(true)}>New offer letter</button>}
    >
      <div className="card">
        <DataTable
          rows={list.data}
          columns={[
            { key: 'id', header: 'Offer' },
            { key: 'candidate', header: 'Candidate', render: (r) => `${r.firstName} ${r.lastName}` },
            { key: 'email', header: 'Email' },
            { key: 'employeeId', header: 'Employee ID', render: (r) => r.employeeId || '-' },
            { key: 'designationName', header: 'Designation' },
            { key: 'departmentName', header: 'Department' },
            { key: 'joiningDate', header: 'Joining date' },
            { key: 'salary', header: 'Monthly salary', render: (r) => rupees(r.basicSalary + r.allowances) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            {
              key: 'act',
              header: 'Actions',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn secondary" type="button" onClick={() => viewLetter(r)}>View</button>
                  <button className="btn secondary" type="button" onClick={() => downloadLetter(r)}>Download</button>
                  {r.status === 'issued' ? (
                    <button className="btn" type="button" onClick={() => createLogin(r)}>Create login</button>
                  ) : (
                    <button className="btn" type="button" onClick={() => resetLogin(r)}>Show /reset login</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {open ? (
        <OfferModal
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            list.reload();
          }}
        />
      ) : null}

      {creds ? <CredentialsModal creds={creds} onClose={() => setCreds(null)} /> : null}
    </PageShell>
  );
}