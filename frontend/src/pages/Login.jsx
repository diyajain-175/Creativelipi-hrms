import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const DEMOS = [
  { label: 'Employee — Asha Verma', email: 'asha@hrms.com' },
  { label: 'Team Leader — Rohit Mehra', email: 'rohit@hrms.com' },
  { label: 'Process Manager — Neha Kapoor', email: 'neha@hrms.com' },
  { label: 'HR Admin — Sanjay Rao', email: 'sanjay@hrms.com' },
  { label: 'Finance — Kiran Das', email: 'kiran@hrms.com' },
  { label: 'IT — Imran Khan', email: 'imran@hrms.com' },
];

export function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('asha@hrms.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-art">
        <p>Internal people system</p>
        <h1>CreativeLipi HRMS</h1>
        <p>Attendance, leave, payroll, and approvals in one place — scoped to your role.</p>
      </div>
      <div className="login-panel">
        <div className="login-card card">
          <h1>Sign in</h1>
          <p className="lede">Use your work email. Development password is password123.</p>
          <form className="form" onSubmit={submit}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            {error ? <div className="error">{error}</div> : null}
            <button className="btn" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="demo-accounts">
            {DEMOS.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword('password123'); }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
