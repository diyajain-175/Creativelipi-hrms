import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

const CATEGORIES = ['Performance', 'Teamwork', 'Innovation', 'Customer Focus', 'Attendance', 'Other'];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-';
}

function AwardModal({ onClose, onDone }) {
  const employees = useApi('/api/employees', []);
  const [form, setForm] = useState({
    employeeId: '',
    title: '',
    category: 'Performance',
    points: '',
    period: currentMonth(),
  });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/rewards', form);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="Give recognition" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Employee
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            required
          >
            <option value="">Select employee</option>
            {(employees.data || []).map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        </label>
        <label>
          Reward title
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Category
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Points
          <input
            type="number"
            min="0"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })}
          />
        </label>
        <label>
          Period
          <input
            type="month"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
          />
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Award</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export function RecognitionPage() {
  const { user } = useAuth();
  const list = useApi('/api/rewards', [user.id]);
  const [open, setOpen] = useState(false);

  const canAward = user.permissions.includes('rewards.manage');
  const isEmployee = user.role === 'employee';

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  const totalPoints = list.data.reduce((sum, row) => sum + row.points, 0);

  return (
    <PageShell
      title="Recognition"
      lede="Rewards and achievements awarded to employees."
      actions={
        canAward ? (
          <button className="btn" onClick={() => setOpen(true)}>Give recognition</button>
        ) : null
      }
    >
      {isEmployee ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Total points: {totalPoints}</strong>
        </div>
      ) : null}

      <div className="card">
        <DataTable
          rows={list.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'title', header: 'Reward' },
            { key: 'category', header: 'Category' },
            { key: 'points', header: 'Points' },
            { key: 'period', header: 'Period', render: (r) => r.period || '-' },
            { key: 'awardedByName', header: 'Awarded by', render: (r) => r.awardedByName || '-' },
            { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
          ]}
        />
      </div>

      {open ? (
        <AwardModal
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            list.reload();
          }}
        />
      ) : null}
    </PageShell>
  );
}