export function PageShell({ title, lede, actions, children }) {
  return (
    <div className="page">
      <div className="profile-head">
        <div>
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
