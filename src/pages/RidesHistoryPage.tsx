import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, ChevronRight, Navigation, MapPin, Clock } from 'lucide-react';
import { api } from '@/api/client';
import { exportToCsv } from '@/utils/exportCsv';

const todayStr = () => new Date().toISOString().slice(0, 10);

const CATEGORY_TITLES: Record<string, string> = {
  completed: 'Courses terminées',
  refused: 'Courses refusées',
  expired: 'Courses expirées (timeout)',
  cancelled: 'Courses annulées',
  no_driver: 'Sans chauffeur (en attente)',
};

const fmtDateTime = (iso: string | null): { date: string; time: string } => {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
};

interface RideRow {
  id: number;
  passenger_name: string | null;
  passenger_phone: string | null;
  driver_name: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  fare: number;
  status: string;
  cancellation_reason: string | null;
  datetime: string | null;
  approach_km: number | null;
  ride_km: number | null;
  duration_min: number | null;
}

const fmtKm = (v: number | null) => (v != null ? `${v.toLocaleString('fr-FR')} km` : '—');
const fmtMin = (v: number | null) => (v != null ? `${v} min` : '—');

export default function RidesHistoryPage() {
  const { category = 'completed' } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const title = CATEGORY_TITLES[category] ?? 'Courses';

  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [rows, setRows] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/stats/dispatch/rides?category=${category}&from=${from}&to=${to}`);
      setRows(res.data?.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, from, to]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Approche/Distance/Durée n'ont de sens que pour les courses réellement effectuées
  const showMetrics = category === 'completed';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/overview')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>
      <p className="text-sm text-gray-500 ml-9 mb-5">{rows.length} course(s) sur la période</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-end gap-3 bg-gray-50/50">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <button onClick={fetchRows} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-marine rounded-lg text-xs font-bold hover:bg-primary/90">
            <Filter size={14} /> Filtrer
          </button>
          <button
            onClick={() => exportToCsv(`courses-${category}-${from}_${to}`,
              ['ID', 'Passager', 'Téléphone', 'Chauffeur', 'Départ', 'Arrivée', 'Approche (km)', 'Distance (km)', 'Durée (min)', 'Montant', 'Date', 'Heure'],
              rows.map((r) => {
                const dt = fmtDateTime(r.datetime);
                return [r.id, r.passenger_name ?? '', r.passenger_phone ?? '', r.driver_name ?? '', r.pickup_address ?? '', r.dropoff_address ?? '', r.approach_km ?? '', r.ride_km ?? '', r.duration_min ?? '', r.fare, dt.date, dt.time];
              }))}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download size={14} /> CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Chargement...</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Aucune course pour cette catégorie sur la période.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Passager', 'Chauffeur', 'Trajet'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                  {showMetrics && (
                    <>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><Navigation size={12} /> Approche</span></th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><MapPin size={12} /> Distance</span></th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><Clock size={12} /> Durée</span></th>
                    </>
                  )}
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & heure</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => {
                  const dt = fmtDateTime(r.datetime);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/cockpit/ride/${r.id}`)}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-gray-500">#{r.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">{r.passenger_name || '—'}</div>
                        <div className="text-xs text-gray-400">{r.passenger_phone || ''}</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-900 font-semibold">{r.driver_name || <span className="text-gray-400 italic font-normal">Non assigné</span>}</td>
                      <td className="px-3 py-2.5 text-gray-600 max-w-[240px]">
                        <div className="truncate">{r.pickup_address || '—'}</div>
                        <div className="truncate text-xs text-gray-400">→ {r.dropoff_address || '—'}</div>
                      </td>
                      {showMetrics && (
                        <>
                          <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{fmtKm(r.approach_km)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-900 font-medium tabular-nums">{fmtKm(r.ride_km)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{fmtMin(r.duration_min)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5 text-right text-gray-900 tabular-nums">{r.fare > 0 ? `${r.fare.toLocaleString('fr-FR')} F` : '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{dt.date} <span className="text-gray-400">{dt.time}</span></td>
                      <td className="px-3 py-2.5 text-gray-300"><ChevronRight size={16} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
