import { useState } from 'react';
import { api } from '../api/client.js';

export function DecisionButtons({ path, onDone }) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  async function act(decision) {
    setErr('');
    try {
      await api.patch(path, { decision, note });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <div>
      <div className="row-actions">
        <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" type="button" onClick={() => act('approve')}>Approve</button>
        <button className="btn danger" type="button" onClick={() => act('reject')}>Reject</button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </div>
  );
}
