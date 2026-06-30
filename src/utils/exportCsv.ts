/**
 * Export CSV générique, sans dépendance.
 * Compatible Excel (ouvre directement les .csv). BOM UTF-8 pour les accents.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (val: string | number | null | undefined): string => {
    const s = val === null || val === undefined ? '' : String(val);
    if (s.includes('"') || s.includes(';') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(';'),
    ...rows.map((r) => r.map(escape).join(';')),
  ];
  const csv = '﻿' + lines.join('\n'); // BOM pour Excel/accents

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
