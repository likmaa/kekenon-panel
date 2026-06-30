import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { api } from '@/api/client';
import { exportToCsv } from '@/utils/exportCsv';

const Shell: React.FC<{ title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-5 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
      </div>
      {children}
    </div>
  </div>
);

/** Modal CA : revenus quotidiens (comme la page revenus). */
export const RevenueModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rows, setRows] = useState<{ label: string; gross_volume: number; rides_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/finance/report?granularity=day')
      .then((r) => setRows(r.data?.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.reduce((s, r) => s + r.gross_volume, 0);

  return (
    <Shell title="Chiffre d'affaires — détail quotidien" subtitle="30 derniers jours" onClose={onClose}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <p className="text-sm text-gray-600">Total période : <span className="font-bold text-gray-900">{total.toLocaleString('fr-FR')} FCFA</span></p>
        <button
          onClick={() => exportToCsv('ca-quotidien', ['Jour', 'Courses', 'Revenus'], rows.map((r) => [r.label, r.rides_count, r.gross_volume]))}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Download size={14} /> CSV
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Chargement...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['Jour', 'Courses', 'Revenus'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium text-gray-800">{r.label}</td>
                  <td className="px-4 py-2 text-gray-600">{r.rides_count}</td>
                  <td className="px-4 py-2 font-semibold text-green-700">{r.gross_volume.toLocaleString('fr-FR')} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
};
