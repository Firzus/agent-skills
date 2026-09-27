import type { ReactNode } from 'react';

export interface Column<Row> {
  key: string;
  header: ReactNode;
  /** `end` aligns numbers and uses tabular figures. */
  align?: 'start' | 'center' | 'end';
  render?: (row: Row) => ReactNode;
}

/** Quiet data table. `caption` carries the source and scope. */
export function Table<Row extends Record<string, unknown>>({ columns, rows, caption, dense = false }: {
  columns: Column<Row>[]; rows: Row[]; caption?: ReactNode; dense?: boolean;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={dense ? 'canvas-table dense' : 'canvas-table'}>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>{columns.map((column) => <th key={column.key} className={column.align === 'end' ? 'canvas-num' : undefined} style={{ textAlign: column.align }}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'end' ? 'canvas-num' : undefined} style={{ textAlign: column.align }}>
                  {column.render ? column.render(row) : String(row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
