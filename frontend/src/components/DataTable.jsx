import { EmptyState } from './EmptyState.jsx';

export function DataTable({ columns, rows, rowKey = 'id' }) {
  if (!rows?.length) return <EmptyState text="Nothing to show yet." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey] ?? JSON.stringify(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
