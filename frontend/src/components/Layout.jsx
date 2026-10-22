import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { NAV } from '../nav.js';
import { api } from '../api/client.js';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/api/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const items = NAV[user.role] || NAV.employee;
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <strong>CreativeLipi</strong>
          <span>Human Resource Management</span>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/profile">My profile</NavLink>
        </nav>
        <div className="side-user">
          <div>{name}</div>
          <div>{user.roleLabel}</div>
          <button type="button" onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="header">
          <div className="search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people, IDs, assets…"
            />
            {results ? (
              <div className="search-results">
                {(results.employees || []).map((r) => (
                  <a key={r.id} href={`/employees/${r.id}`} onClick={() => setQ('')}>
                    {r.label} · {r.sub}
                  </a>
                ))}
                {(results.assets || []).map((r) => (
                  <div key={r.id}>
                    {r.label} · {r.sub}
                  </div>
                ))}
                {!results.employees?.length && !results.assets?.length ? <div>No matches</div> : null}
              </div>
            ) : null}
          </div>
          <div className="header-meta">
            {user.employee?.department}
            <div>{user.employee?.employeeCode}</div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
