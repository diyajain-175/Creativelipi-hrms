import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { DecisionButtons } from '../components/DecisionButtons.jsx';
import { api } from '../api/client.js';

const RULES = [
  'Target Achievement',
  'Attendance Bonus',
  'Quality Bonus',
  'Referral Bonus',
  'Special Recognition',
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function RecommendModal({ user, onClose, onDone }) {
  const employees = useApi('/api/employees', []);
  const [form, setForm] = useState({
    employeeId: '',
    ruleCode: RULES[0],
    amount: '',
    points: '',
    period: currentMonth(),
    reason: '',
  });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/incentives', form);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  const options = (employees.data || []).filter((emp) => emp.id !== user.employeeId);

  return (
    <Modal title="Recommend incentive" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Employee
          <select
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            required
          >
            <option value="">Select employee</option>
            {options.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>
        </label>
        <label>
          Incentive rule
          <select
            value={form.ruleCode}
            onChange={(e) => setForm({ ...form, ruleCode: e.target.value })}
          >
            {RULES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Amount (₹)
          <input
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
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
            required
          />
        </label>
        <label>
          Reason
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Submit</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export function IncentivesPage() {
  const { user } = useAuth();
  const list = useApi('/api/incentives', [user.id]);
  const [open, setOpen] = useState(false);

  const canRecommend = ['team_leader', 'process_manager', 'hr_admin'].includes(user.role);

  function canDecideRow(row) {
    if (row.employeeId === user.employeeId) return false;

    if (user.role === 'process_manager') {
      return row.status === 'pending_process_manager';
    }

    if (user.role === 'hr_admin') {
      return ['pending_process_manager', 'pending_hr'].includes(row.status);
    }

    return false;
  }

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  return (
    <PageShell
      title="Incentives"
      lede="Team Leader → Process Manager → HR. Approved incentives are added to payroll."
      actions={
        canRecommend ? (
          <button className="btn" onClick={() => setOpen(true)}>Recommend incentive</button>
        ) : null
      }
    >
      <div className="card">
        <DataTable
          rows={list.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'ruleCode', header: 'Rule' },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}`,
            },
            { key: 'points', header: 'Points' },
            { key: 'period', header: 'Period' },
            { key: 'reason', header: 'Reason' },
            { key: 'recommendedByName', header: 'Recommended by', render: (r) => r.recommendedByName || '-' },
            { key: 'approvedByName', header: 'Approved by', render: (r) => r.approvedByName || '-' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            {
              key: 'act',
              header: 'Action',
              render: (r) =>
                canDecideRow(r) ? (
                  <DecisionButtons
                    path={`/api/incentives/${r.id}/decision`}
                    onDone={list.reload}
                  />
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </div>

      {open ? (
        <RecommendModal
          user={user}
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