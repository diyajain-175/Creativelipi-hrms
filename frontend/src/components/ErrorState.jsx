export function ErrorState({ error }) {
  return <div className="state error">{error?.message || 'Something went wrong.'}</div>;
}
