import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

export function ChangePasswordPage() {
  const { logout, refresh } = useAuth();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg('');

    if (form.newPassword !== form.confirm) {
      setMsg('New password and confirm password do not match.');
      return;
    }

    setSaving(true);

    try {
      await api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      await refresh();
    } catch (err) {
      setMsg(err.message);
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form className="card form" style={{ width: 'min(420px, 100%)' }} onSubmit={submit}>
        <h2>Set your new password</h2>
        <p>
          You signed in with a temporary password. Please choose your own password
          to continue (at least 8 characters, with a letter and a number).
        </p>
        <label>
          Temporary password
          <input
            type="password"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={form.newPassword}
            onChange={set('newPassword')}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            required
          />
        </label>
        {msg ? <div className="error">{msg}</div> : null}
        <div className="actions">
          <button className="btn" type="submit" disabled={saving}>
            Save password
          </button>
          <button className="btn secondary" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}