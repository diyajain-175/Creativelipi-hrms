import { MetricCard } from '../../components/MetricCard.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function ITDashboard({ data }) {
  return (
    <div className="page">
      <h1>{data.welcome}</h1>
      <p className="lede">Assign and recover company hardware after process approval.</p>
      <div className="grid grid-3">
        <MetricCard label="Assets" value={data.assets?.length || 0} />
        <MetricCard label="Waiting on IT" value={data.pendingRequests?.length || 0} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Inventory</h3>
        <DataTable
          rows={data.assets}
          columns={[
            { key: 'assetCode', header: 'Asset' },
            { key: 'assetType', header: 'Type' },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
            { key: 'assignedEmployee', header: 'Assigned to' },
          ]}
        />
      </div>
    </div>
  );
}
