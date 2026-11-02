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

const EXPENSE_TYPES = ['Travel', 'Food', 'Internet / Phone', 'Office Supplies', 'Other'];

const emptyForm = {
  expenseType: 'Travel',
  amount: '',
  expenseDate: '',
  description: '',
  receiptName: '',
};

export function ReimbursementsPage() {
  const { user } = useAuth();
  const list = useApi('/api/reimbursements', [user.id]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');

  const canSubmit = ['employee', 'hr_admin'].includes(user.role);

    function canDecideRow(row) {
    if (row.employeeId === user.employeeId) return false;

    if (user.role === 'team_leader') {
      return row.status === 'pending_team_leader';
    }

    if (user.role === 'process_manager' || user.role === 'hr_admin') {
      return ['pending_team_leader', 'pending_process_manager'].includes(row.status);
    }

    if (user.role === 'finance') {
      return row.status === 'pending_finance';
    }

    return false;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/reimbursements', form);
      setOpen(false);
      setForm(emptyForm);
      list.reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  return (
    <PageShell
      title="Reimbursements"
      lede="Employee → Team Leader → Process Manager → Finance. Finance approval marks it paid."
      actions={
        canSubmit ? (
          <button className="btn" onClick={() => setOpen(true)}>New request</button>
        ) : null
      }
    >
      <div className="card">
        <DataTable
          rows={list.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'expenseType', header: 'Type' },
            {
              key: 'amount',
              header: 'Amount',
              render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}`,
            },
            { key: 'expenseDate', header: 'Expense date' },
            { key: 'description', header: 'Description' },
            { key: 'receiptName', header: 'Receipt', render: (r) => r.receiptName || '-' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            {
              key: 'act',
              header: 'Action',
              render: (r) =>
                canDecideRow(r) ? (
                  <DecisionButtons
                    path={`/api/reimbursements/${r.id}/decision`}
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
        <Modal title="New reimbursement" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={submit}>
            <label>
              Expense type
              <select
                value={form.expenseType}
                onChange={(e) => setForm({ ...form, expenseType: e.target.value })}
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
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
              Expense date
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </label>
            <label>
              Receipt name / bill number
              <input
                value={form.receiptName}
                onChange={(e) => setForm({ ...form, receiptName: e.target.value })}
              />
            </label>
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