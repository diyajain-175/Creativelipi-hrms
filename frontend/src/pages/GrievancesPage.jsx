import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

const CATEGORIES = ['Workplace', 'Manager', 'Payroll', 'Harassment', 'IT / Equipment', 'Other'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const emptyForm = { subject: '', category: 'Workplace', priority: 'medium', description: '' };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-';
}

export function GrievancesPage() {
  const { user } = useAuth();
  const list = useApi('/api/grievances', [user.id]);

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState({ body: '', status: 'open', resolution: '' });
  const [msg, setMsg] = useState('');

  const isHr = user.role === 'hr_admin';
  const isEmployee = user.role === 'employee';
  const selected = list.data?.find((g) => g.id === selectedId);
  const canReply = selected && (isHr || selected.employeeId === user.employeeId);

  function openDetail(row) {
    setSelectedId(row.id);
    setReply({ body: '', status: row.status, resolution: row.resolution || '' });
    setMsg('');
  }

  function closeNew() {
    setNewOpen(false);
    setMsg('');
  }

  async function submitNew(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/grievances', form);
      setForm(emptyForm);
      closeNew();
      list.reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    setMsg('');
    try {
      const payload = isHr
        ? reply
        : { body: reply.body };

      await api.post(`/api/grievances/${selected.id}/comments`, payload);
      setReply((current) => ({ ...current, body: '' }));
      list.reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (list.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;

  return (
    <PageShell
      title="Grievances"
      lede="Raise an issue and track HR's replies and resolution."
      actions={
        isEmployee ? (
          <button className="btn" onClick={() => setNewOpen(true)}>New grievance</button>
        ) : null
      }
    >
      <div className="card">
        <DataTable
          rows={list.data}
          columns={[
            { key: 'subject', header: 'Subject' },
            { key: 'employeeName', header: 'Employee' },
            { key: 'category', header: 'Category' },
            { key: 'priority', header: 'Priority', render: (r) => <StatusBadge value={r.priority} /> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'createdAt', header: 'Created', render: (r) => formatDate(r.createdAt) },
            {
              key: 'act',
              header: '',
              render: (r) => (
                <button className="btn secondary" type="button" onClick={() => openDetail(r)}>
                  View
                </button>
              ),
            },
          ]}
        />
      </div>

      {newOpen ? (
        <Modal title="New grievance" onClose={closeNew}>
          <form className="form" onSubmit={submitNew}>
            <label>
              Subject
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
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
              Priority
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </label>
            {msg ? <div className="error">{msg}</div> : null}
            <div className="actions">
              <button className="btn" type="submit">Submit</button>
              <button className="btn secondary" type="button" onClick={closeNew}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {selected ? (
        <Modal title={selected.subject} onClose={() => setSelectedId('')}>
          <div className="form">
            <p>
              <StatusBadge value={selected.status} /> · {selected.category} · {selected.priority} priority
            </p>
            <p>{selected.description}</p>
            {selected.resolution ? <p><strong>Resolution:</strong> {selected.resolution}</p> : null}

            <h4>Replies</h4>
            {selected.comments.length === 0 ? <p>No replies yet.</p> : null}
            {selected.comments.map((c) => (
              <p key={c.id}>
                <strong>{c.authorId === selected.employeeId ? selected.employeeName : 'HR'}</strong>{' '}
                ({formatDate(c.createdAt)}): {c.body}
              </p>
            ))}

            {canReply ? (
              <form className="form" onSubmit={sendReply}>
                <label>
                  Reply
                  <textarea
                    value={reply.body}
                    onChange={(e) => setReply({ ...reply, body: e.target.value })}
                    required
                  />
                </label>
                {isHr ? (
                  <>
                    <label>
                      Status
                      <select
                        value={reply.status}
                        onChange={(e) => setReply({ ...reply, status: e.target.value })}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Resolution
                      <textarea
                        value={reply.resolution}
                        onChange={(e) => setReply({ ...reply, resolution: e.target.value })}
                      />
                    </label>
                  </>
                ) : null}
                {msg ? <div className="error">{msg}</div> : null}
                <div className="actions">
                  <button className="btn" type="submit">Send</button>
                </div>
              </form>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}