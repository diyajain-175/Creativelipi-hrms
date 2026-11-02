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

const COURSE_KINDS = ['Online', 'Classroom', 'Workshop', 'Certification'];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '-';
}

function AddCourseModal({ onClose, onDone }) {
  const [form, setForm] = useState({ title: '', kind: 'Online', hours: '' });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/learning/courses', form);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="Add course" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Course title
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </label>
        <label>
          Category
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            {COURSE_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Duration (hours)
          <input
            type="number"
            min="1"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
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

function AssignModal({ onClose, onDone }) {
  const employees = useApi('/api/employees', []);
  const courses = useApi('/api/learning/courses', []);
  const [form, setForm] = useState({ employeeId: '', courseId: '' });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/learning/assign', form);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <Modal title="Assign course" onClose={onClose}>
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
          Course
          <select
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            required
          >
            <option value="">Select course</option>
            {(courses.data || []).map((c) => (
              <option key={c.id} value={c.id}>{c.title} ({c.hours}h)</option>
            ))}
          </select>
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit">Assign</button>
          <button className="btn secondary" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export function LearningPage() {
  const { user } = useAuth();
  const list = useApi('/api/learning', [user.id]);
  const courses = useApi('/api/learning/courses', [user.id]);
  const [modal, setModal] = useState('');

  const canAssign = user.permissions.includes('learning.assign');
  const isHr = user.role === 'hr_admin';

  async function complete(id) {
    try {
      await api.post(`/api/learning/${id}/complete`, {});
      list.reload();
    } catch (err) {
      alert(err.message);
    }
  }

  function done() {
    setModal('');
    list.reload();
    courses.reload();
  }

  if (list.loading || courses.loading) return <LoadingState />;
  if (list.error) return <ErrorState error={list.error} />;
  if (courses.error) return <ErrorState error={courses.error} />;

  return (
    <PageShell
      title="Learning & Development"
      lede="Assigned courses, progress and certificates."
      actions={
        <>
          {isHr ? (
            <button className="btn secondary" onClick={() => setModal('course')}>Add course</button>
          ) : null}
          {canAssign ? (
            <button className="btn" onClick={() => setModal('assign')}>Assign course</button>
          ) : null}
        </>
      }
    >
      <div className="card">
        <h3>Assigned courses</h3>
        <DataTable
          rows={list.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'courseTitle', header: 'Course' },
            { key: 'kind', header: 'Category' },
            { key: 'hours', header: 'Hours' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'completedAt', header: 'Completed', render: (r) => formatDate(r.completedAt) },
            { key: 'certificate', header: 'Certificate', render: (r) => r.certificate || '-' },
            {
              key: 'act',
              header: 'Action',
              render: (r) =>
                r.employeeId === user.employeeId && r.status !== 'completed' ? (
                  <button className="btn" type="button" onClick={() => complete(r.id)}>
                    Mark complete
                  </button>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </div>

      {canAssign ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Course catalog</h3>
          <DataTable
            rows={courses.data}
            columns={[
              { key: 'title', header: 'Course' },
              { key: 'kind', header: 'Category' },
              { key: 'hours', header: 'Hours' },
            ]}
          />
        </div>
      ) : null}

      {modal === 'course' ? <AddCourseModal onClose={() => setModal('')} onDone={done} /> : null}
      {modal === 'assign' ? <AssignModal onClose={() => setModal('')} onDone={done} /> : null}
    </PageShell>
  );
}