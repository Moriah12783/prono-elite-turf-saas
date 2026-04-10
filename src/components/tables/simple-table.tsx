import { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type SimpleTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
};

export function SimpleTable<T>({ columns, rows }: SimpleTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="pb-4 pr-6 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="py-4 pr-6 text-sm text-slate-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

