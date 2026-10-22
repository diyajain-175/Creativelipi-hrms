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

export function LeavePage() {
  const { user } = useAuth();
  const list = useApi('/api/leave', [user.id]);
  const types = useApi('/api/leave/types', []);
  const balances = useApi('/api/leave/balances', [user.id]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const [msg, setMsg] = useState('');

  const canDecide = ['team_leader', 'process_manager', 'hr_admin'].includes(user.role);

  async function apply(e) {
    e.preventDefault();
    try {
      await api.post('/api/leave', form);
      setOpen(false);
      list.reload();
      balances.reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  return (
    <PageShell
      title="Leave"
      lede="Employee → Team Leader → Process Manager. Long leave also needs HR."
      actions={<button className="btn" onClick={() => setOpen(true)}>Apply leave</button>}
    >
      <div className="grid grid-4">
        {(balances.data || []).map((b) => (
          <div className="card" key={b.id}>
            <div className="metric-label">{b.leaveType}</div>
            <div className="metric">{b.balance}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <DataTable
          rows={list.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'leaveTypeName', header: 'Type' },
            { key: 'startDate', header: 'From' },
            { key: 'endDate', header: 'To' },
            { key: 'days', header: 'Days' },
            { key: 'reason', header: 'Reason' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            canDecide
              ? {
                  key: 'act',
                  header: '',
                  render: (r) => <DecisionButtons path={`/api/leave/${r.id}/decision`} onDone={list.reload} />,
                }
              : { key: 'decisionNote', header: 'Note' },
          ]}
        />
      </div>
      {open ? (
        <Modal title="Apply leave" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={apply}>
            <label>
              Type
              <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                {(types.data || []).map((t) => (
                  <option key={t.code} value={t.code}>{t.name}</option>
                ))}
              </select>
            </label>
            <label>From<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></label>
            <label>To<input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>
            <label>Reason<textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required /></label>
            {msg ? <div className="error">{msg}</div> : null}
            <div className="actions">
              <button className="btn" type="submit">Submit</button>
              <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
