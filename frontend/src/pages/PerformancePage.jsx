import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function EmployeePicker({ value, onChange }) {
  const employees = useApi('/api/employees', []);

  return (
    <label>
      Employee{' '}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {(employees.data || []).map((emp) => (
          <option key={emp.id} value={emp.id}>{emp.fullName}</option>
        ))}
      </select>
    </label>
  );
}

function ProgressControl({ goal, onDone }) {
  const [value, setValue] = useState(goal.progress);
  const [err, setErr] = useState('');

  async function save() {
    setErr('');
    try {
      await api.patch(`/api/performance/goals/${goal.id}/progress`, { progress: value });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="row-actions">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: 70 }}
        />
        <button className="btn secondary" type="button" onClick={save}>Save</button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </div>
  );
}

function GoalModal({ employeeId, onClose, onDone }) {
  const [form, setForm] = useState({
    title: '',
    kpi: '',
    target: '',
    period: currentMonth(),
  });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/performance/goals', { ...form, employeeId });
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="Add goal" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Goal title
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          KPI
          <input
            value={form.kpi}
            onChange={(e) => setForm({ ...form, kpi: e.target.value })}
          />
        </label>
        <label>
          Target
          <input
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
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
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Save</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewModal({ employeeId, onClose, onDone }) {
  const [form, setForm] = useState({
    period: currentMonth(),
    score: '',
    managerFeedback: '',
  });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/performance/reviews', { ...form, employeeId });
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="Add review" onClose={onClose}>
      <form className="form" onSubmit={submit}>
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
          Score (0 to 10)
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={form.score}
            onChange={(e) => setForm({ ...form, score: e.target.value })}
            required
          />
        </label>
        <label>
          Manager feedback
          <textarea
            value={form.managerFeedback}
            onChange={(e) => setForm({ ...form, managerFeedback: e.target.value })}
            required
          />
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Save</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function FeedbackModal({ review, onClose, onDone }) {
  const [feedback, setFeedback] = useState(review.employeeFeedback || '');
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.patch(`/api/performance/reviews/${review.id}/feedback`, { feedback });
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title={`My feedback (${review.period})`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Feedback
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} required />
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Save</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export function PerformancePage() {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState(user.employeeId);
  const goals = useApi(`/api/performance/goals?employeeId=${employeeId}`, [employeeId]);
  const reviews = useApi(`/api/performance/reviews?employeeId=${employeeId}`, [employeeId]);
  const [modal, setModal] = useState('');
  const [feedbackReview, setFeedbackReview] = useState(null);

  const isManager = ['team_leader', 'process_manager', 'hr_admin'].includes(user.role);
  const viewingSelf = employeeId === user.employeeId;

  function done() {
    setModal('');
    setFeedbackReview(null);
    goals.reload();
    reviews.reload();
  }

  return (
    <PageShell
      title="Performance"
      lede="Goals, progress, reviews and feedback."
      actions={
        isManager && !viewingSelf ? (
          <>
            <button className="btn secondary" onClick={() => setModal('goal')}>Add goal</button>
            <button className="btn" onClick={() => setModal('review')}>Add review</button>
          </>
        ) : null
      }
    >
      {isManager ? (
        <div style={{ marginBottom: 16 }}>
          <EmployeePicker value={employeeId} onChange={setEmployeeId} />
        </div>
      ) : null}

      <div className="card">
        <h3>Goals</h3>
        {goals.loading ? <LoadingState /> : goals.error ? <ErrorState error={goals.error} /> : (
          <DataTable
            rows={goals.data}
            columns={[
              { key: 'title', header: 'Goal' },
              { key: 'kpi', header: 'KPI', render: (r) => r.kpi || '-' },
              { key: 'target', header: 'Target', render: (r) => r.target || '-' },
              { key: 'period', header: 'Period' },
              { key: 'progress', header: 'Progress', render: (r) => `${r.progress}%` },
              ...(isManager && !viewingSelf
                ? [
                    {
                      key: 'act',
                      header: 'Update progress',
                      render: (r) => (
                        <ProgressControl
                          key={`${r.id}-${r.progress}`}
                          goal={r}
                          onDone={goals.reload}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Reviews</h3>
        {reviews.loading ? <LoadingState /> : reviews.error ? <ErrorState error={reviews.error} /> : (
          <DataTable
            rows={reviews.data}
            columns={[
              { key: 'period', header: 'Period' },
              { key: 'score', header: 'Score' },
              { key: 'managerFeedback', header: 'Manager feedback', render: (r) => r.managerFeedback || '-' },
              { key: 'employeeFeedback', header: 'Employee feedback', render: (r) => r.employeeFeedback || '-' },
              { key: 'reviewerName', header: 'Reviewer', render: (r) => r.reviewerName || '-' },
              {
                key: 'act',
                header: 'Action',
                render: (r) =>
                  r.employeeId === user.employeeId ? (
                    <button className="btn secondary" type="button" onClick={() => setFeedbackReview(r)}>
                      {r.employeeFeedback ? 'Edit feedback' : 'Add feedback'}
                    </button>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        )}
      </div>

      {modal === 'goal' ? (
        <GoalModal employeeId={employeeId} onClose={() => setModal('')} onDone={done} />
      ) : null}
      {modal === 'review' ? (
        <ReviewModal employeeId={employeeId} onClose={() => setModal('')} onDone={done} />
      ) : null}
      {feedbackReview ? (
        <FeedbackModal review={feedbackReview} onClose={() => setFeedbackReview(null)} onDone={done} />
      ) : null}
    </PageShell>
  );
}