import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { PageShell } from '../components/PageShell.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { api } from '../api/client.js';
import { useState } from 'react';

export function PayrollPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/api/payroll', [user.id]);
  const [msg, setMsg] = useState('');
  const canManage = user.permissions.includes('payroll.manage');

  async function generate() {
    try {
      const result = await api.post('/api/payroll/generate', { period: new Date().toISOString().slice(0, 7) });
      setMsg(`Generated ${result.count} slips using ${result.formula}`);
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <PageShell
      title="Payroll"
      lede="Net = basic + allowances + incentives + bonus − deductions − penalties. Only approved penalties and incentives count."
      actions={canManage ? <button className="btn" onClick={generate}>Generate this month</button> : null}
    >
      {msg ? <p>{msg}</p> : null}
      <div className="card">
        <DataTable
          rows={data}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'period', header: 'Period' },
            { key: 'basic', header: 'Basic' },
            { key: 'allowances', header: 'Allowances' },
            { key: 'incentives', header: 'Incentives' },
            { key: 'deductions', header: 'Deductions' },
            { key: 'penalties', header: 'Penalties' },
            { key: 'net', header: 'Net' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            canManage
              ? {
                  key: 'act',
                  header: '',
                  render: (r) =>
                    r.status !== 'paid' ? (
                      <button className="btn secondary" onClick={() => api.patch(`/api/payroll/${r.id}/paid`, {}).then(reload)}>
                        Mark paid
                      </button>
                    ) : null,
                }
              : { key: 'formula', header: 'Formula' },
          ]}
        />
      </div>
    </PageShell>
  );
}
