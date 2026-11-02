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

const ASSET_TYPES = ['Laptop', 'Desktop', 'Keyboard', 'Mouse', 'Headphones', 'Other'];

function ItDecision({ request, available, onDone }) {
  const [assetId, setAssetId] = useState('');
  const [err, setErr] = useState('');
  const options = available.filter((a) => a.assetType === request.assetType);

  async function act(decision) {
    setErr('');
    try {
      await api.patch(`/api/assets/requests/${request.id}/decision`, { decision, assetId });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <div className="row-actions">
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          <option value="">Select asset</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>{a.assetCode}</option>
          ))}
        </select>
        <button className="btn" type="button" onClick={() => act('approve')}>Assign</button>
        <button className="btn danger" type="button" onClick={() => act('reject')}>Reject</button>
      </div>
      {err ? <div className="error">{err}</div> : null}
    </div>
  );
}

export function AssetsPage() {
  const { user } = useAuth();
  const assets = useApi('/api/assets', [user.id]);
  const requests = useApi('/api/assets/requests', [user.id]);

  const [modal, setModal] = useState('');
  const [assetForm, setAssetForm] = useState({
    assetType: 'Laptop',
    assetCode: '',
    serialNumber: '',
    condition: 'good',
  });
  const [requestForm, setRequestForm] = useState({ assetType: 'Laptop', reason: '' });
  const [msg, setMsg] = useState('');

  const isIt = user.role === 'it_admin';
  const isEmployee = user.role === 'employee';

  function reloadAll() {
    assets.reload();
    requests.reload();
  }

  function closeModal() {
    setModal('');
    setMsg('');
  }

  function canDecideRow(row) {
    if (row.employeeId === user.employeeId) return false;

    if (user.role === 'team_leader') return row.status === 'pending_team_leader';

    if (user.role === 'process_manager' || user.role === 'hr_admin') {
      return ['pending_team_leader', 'pending_process_manager'].includes(row.status);
    }

    if (user.role === 'it_admin') return row.status === 'pending_it';

    return false;
  }

  async function addAsset(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/assets', assetForm);
      setAssetForm({ assetType: 'Laptop', assetCode: '', serialNumber: '', condition: 'good' });
      closeModal();
      reloadAll();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function requestAsset(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/assets/requests', requestForm);
      setRequestForm({ assetType: 'Laptop', reason: '' });
      closeModal();
      reloadAll();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function markReturned(id) {
    try {
      await api.patch(`/api/assets/${id}/return`, {});
      reloadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  if (assets.loading || requests.loading) return <LoadingState />;
  if (assets.error) return <ErrorState error={assets.error} />;
  if (requests.error) return <ErrorState error={requests.error} />;

  const available = (assets.data || []).filter((a) => a.status === 'available');

  return (
    <PageShell
      title="IT Assets"
      lede="Employee → Team Leader → Process Manager → IT Admin."
      actions={
        <>
          {isIt ? (
            <button className="btn" onClick={() => setModal('asset')}>Add asset</button>
          ) : null}
          {isEmployee ? (
            <button className="btn" onClick={() => setModal('request')}>Request asset</button>
          ) : null}
        </>
      }
    >
      <div className="card">
        <h3>{isIt || user.role === 'hr_admin' ? 'Inventory' : 'My assets'}</h3>
        <DataTable
          rows={assets.data}
          columns={[
            { key: 'assetCode', header: 'Asset code' },
            { key: 'assetType', header: 'Type' },
            { key: 'serialNumber', header: 'Serial no.', render: (r) => r.serialNumber || '-' },
            { key: 'condition', header: 'Condition' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'assignedEmployee', header: 'Assigned to', render: (r) => r.assignedEmployee || '-' },
            { key: 'assignmentDate', header: 'Assigned on', render: (r) => r.assignmentDate || '-' },
            {
              key: 'act',
              header: 'Action',
              render: (r) =>
                isIt && r.status === 'assigned' ? (
                  <button className="btn secondary" type="button" onClick={() => markReturned(r.id)}>
                    Mark returned
                  </button>
                ) : (
                  '-'
                ),
            },
          ]}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Asset requests</h3>
        <DataTable
          rows={requests.data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'assetType', header: 'Asset type' },
            { key: 'reason', header: 'Reason' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            {
              key: 'act',
              header: 'Action',
              render: (r) => {
                if (!canDecideRow(r)) return '-';

                return isIt ? (
                  <ItDecision request={r} available={available} onDone={reloadAll} />
                ) : (
                  <DecisionButtons
                    path={`/api/assets/requests/${r.id}/decision`}
                    onDone={reloadAll}
                  />
                );
              },
            },
          ]}
        />
      </div>

      {modal === 'asset' ? (
        <Modal title="Add asset" onClose={closeModal}>
          <form className="form" onSubmit={addAsset}>
            <label>
              Type
              <select
                value={assetForm.assetType}
                onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Asset code
              <input
                value={assetForm.assetCode}
                onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                required
              />
            </label>
            <label>
              Serial number
              <input
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
              />
            </label>
            <label>
              Condition
              <select
                value={assetForm.condition}
                onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </label>
            {msg ? <div className="error">{msg}</div> : null}
            <div className="actions">
              <button className="btn" type="submit">Save</button>
              <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'request' ? (
        <Modal title="Request asset" onClose={closeModal}>
          <form className="form" onSubmit={requestAsset}>
            <label>
              Asset type
              <select
                value={requestForm.assetType}
                onChange={(e) => setRequestForm({ ...requestForm, assetType: e.target.value })}
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                required
              />
            </label>
            {msg ? <div className="error">{msg}</div> : null}
            <div className="actions">
              <button className="btn" type="submit">Submit</button>
              <button className="btn secondary" type="button" onClick={closeModal}>Cancel</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}