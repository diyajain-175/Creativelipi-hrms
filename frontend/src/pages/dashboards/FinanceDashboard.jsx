import { MetricCard } from '../../components/MetricCard.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function FinanceDashboard({ data }) {
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Salary runs and expense payments. Deductions apply only after approval.</p>
      <div className="grid grid-3">
        <MetricCard label="Pending reimbursements" value={data.pendingReimbursements} />
        <MetricCard label="Payroll rows" value={data.payroll?.length || 0} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent payroll</h3>
        <DataTable
          rows={data.payroll}
          columns={[
            { key: 'employeeName', header: 'Employee' },
            { key: 'period', header: 'Period' },
            { key: 'net', header: 'Net' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          ]}
        />
      </div>
    </div>
  );
}
