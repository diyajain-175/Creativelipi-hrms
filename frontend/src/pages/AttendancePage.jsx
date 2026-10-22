import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export function AttendancePage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/api/attendance', [user.id]);
  const [importText, setImportText] = useState('EMP-1005,2026-10-21,09:04,18:01,present');
  const [msg, setMsg] = useState('');
  const canImport = user.permissions.includes('attendance.import');

  async function punch(kind) {
    try {
      await api.post(`/api/attendance/${kind}`, {});
      setMsg('');
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function importCsv() {
    const rows = importText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [employeeId, date, checkIn, checkOut, status] = line.split(',').map((s) => s.trim());
        return { employeeId, date, checkIn, checkOut, status };
      });
    try {
      const result = await api.post('/api/attendance/import', { rows });
      setMsg(`Imported ${result.imported} rows.`);
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <PageShell
      title="Attendance"
      lede="Manual punch today. Biometric files import as CSV rows: Employee ID, Date, Check-in, Check-out, Status."
      actions={
        <div className="actions">
          <button className="btn" onClick={() => punch('check-in')}>Check in</button>
          <button className="btn secondary" onClick={() => punch('check-out')}>Check out</button>
        </div>
      }
    >
      {msg ? <p className="error">{msg}</p> : null}
      <div className="card">
        <DataTable
          rows={data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'workDate', header: 'Date' },
            { key: 'checkIn', header: 'In' },
            { key: 'checkOut', header: 'Out' },
            { key: 'workingMinutes', header: 'Minutes' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'source', header: 'Source' },
          ]}
        />
      </div>
      {canImport ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Import biometric CSV</h3>
          <textarea rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} />
          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={importCsv}>Import</button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
