import React, { useEffect, useState } from 'react';
import { api, getDriverDailyStats, getTopDriversDailyStats, type DriverDailyStatsRow, type TopDriversDailyEntry } from '@/api/client';

export default function DriversStatsPage() {
  type DriverOption = { id: number; name: string; phone: string };

  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const [driverIdInput, setDriverIdInput] = useState<string>('');
  const [driverId, setDriverId] = useState<number | null>(null);

  const [dailyStats, setDailyStats] = useState<DriverDailyStatsRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [topStats, setTopStats] = useState<TopDriversDailyEntry[]>([]);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  type DriverScore = {
    driver_id: number;
    name: string;
    phone: string;
    score: number;
    rank: number;
    components: { activite: number; satisfaction: number; ponctualite: number; discipline: number };
    kpi: {
      completed_rides: number;
      accepted_rides: number;
      gross_volume: number;
      cancellation_rate_pct: number;
      avg_pickup_seconds: number | null;
      rating: number | null;
      rating_count: number;
      debt_amount: number;
      debt_level: 'ok' | 'notify' | 'alert' | 'blocked';
    };
  };
  const [scores, setScores] = useState<DriverScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const [scorePeriod, setScorePeriod] = useState<number>(30);

  useEffect(() => {
    const runScores = async () => {
      setScoresLoading(true);
      setScoresError(null);
      try {
        const res = await api.get(`/api/admin/stats/drivers/scores?days=${scorePeriod}`);
        setScores(res.data?.drivers ?? []);
      } catch (e: any) {
        setScoresError(e?.response?.data?.message || 'Impossible de charger les scores chauffeurs');
      } finally {
        setScoresLoading(false);
      }
    };
    runScores();
  }, [scorePeriod]);

  useEffect(() => {
    const fetchDrivers = async () => {
      setDriversLoading(true);
      setDriversError(null);
      try {
        const res = await api.get('/api/admin/drivers/approved');
        const data = (res.data?.data ?? res.data) as any[];
        const mapped: DriverOption[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
        }));
        setDrivers(mapped);
      } catch (e: any) {
        setDriversError(e?.response?.data?.message || "Impossible de charger la liste des chauffeurs");
      } finally {
        setDriversLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  useEffect(() => {
    const runTop = async () => {
      setTopLoading(true);
      setTopError(null);
      try {
        const res = await getTopDriversDailyStats({ from: from || undefined, to: to || undefined });
        setTopStats(res.data || []);
      } catch (e: any) {
        setTopError(e?.response?.data?.message || "Impossible de charger le classement des chauffeurs");
      } finally {
        setTopLoading(false);
      }
    };
    runTop();
  }, [from, to]);

  const handleLoadDriverStats = async () => {
    if (!driverIdInput.trim()) return;
    const parsed = Number(driverIdInput.trim());
    if (!parsed || Number.isNaN(parsed)) {
      setDailyError("ID chauffeur invalide");
      return;
    }

    setDriverId(parsed);
    setDailyLoading(true);
    setDailyError(null);
    try {
      const res = await getDriverDailyStats({ driverId: parsed, from: from || undefined, to: to || undefined });
      setDailyStats(res.data || []);
    } catch (e: any) {
      setDailyError(e?.response?.data?.message || "Impossible de charger les statistiques du chauffeur");
    } finally {
      setDailyLoading(false);
    }
  };

  const scoreColor = (s: number) => (s >= 80 ? 'text-green-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-orange-600' : 'text-red-600');
  const debtBadge: Record<string, { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'bg-green-100 text-green-700' },
    notify: { label: 'Niv.1', cls: 'bg-yellow-100 text-yellow-700' },
    alert: { label: 'Niv.2', cls: 'bg-orange-100 text-orange-700' },
    blocked: { label: 'Niv.3', cls: 'bg-red-600 text-white' },
  };

  return (
    <div className="space-y-8">
      {/* §20.5 — Score & Classement chauffeurs */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Score & Classement chauffeurs</h2>
            <p className="text-sm text-gray-500">
              Score /100 = 40% activité · 30% satisfaction · 20% ponctualité · 10% discipline
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setScorePeriod(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${scorePeriod === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {d} j
              </button>
            ))}
          </div>
        </div>

        {scoresLoading && <p className="text-sm text-gray-500">Chargement des scores...</p>}
        {scoresError && <p className="text-sm text-red-600 mb-2">{scoresError}</p>}

        {!scoresLoading && scores.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Chauffeur', 'Score', 'Activité', 'Satisf.', 'Ponctu.', 'Discip.', 'Courses', 'Note', 'Annul.', 'Dette'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scores.map((d) => (
                  <tr key={d.driver_id} className={d.rank <= 3 ? 'bg-indigo-50/40' : ''}>
                    <td className="px-3 py-2 font-bold text-gray-700">
                      {d.rank <= 3 ? ['🥇', '🥈', '🥉'][d.rank - 1] : d.rank}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-500">{d.phone}</div>
                    </td>
                    <td className={`px-3 py-2 font-black text-lg ${scoreColor(d.score)}`}>{d.score}</td>
                    <td className="px-3 py-2 text-gray-600">{d.components.activite}</td>
                    <td className="px-3 py-2 text-gray-600">{d.components.satisfaction}</td>
                    <td className="px-3 py-2 text-gray-600">{d.components.ponctualite}</td>
                    <td className="px-3 py-2 text-gray-600">{d.components.discipline}</td>
                    <td className="px-3 py-2 text-gray-700">{d.kpi.completed_rides}</td>
                    <td className="px-3 py-2 text-gray-700">{d.kpi.rating != null ? `${d.kpi.rating}★` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{d.kpi.cancellation_rate_pct}%</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${debtBadge[d.kpi.debt_level].cls}`}>
                        {debtBadge[d.kpi.debt_level].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!scoresLoading && scores.length === 0 && !scoresError && (
          <p className="text-sm text-gray-500 mt-2">Aucune activité chauffeur sur la période sélectionnée.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Statistiques journalières par chauffeur</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sélectionnez un chauffeur pour voir ses statistiques journalières (courses terminées, annulées, revenus...).
        </p>

        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Chauffeur</label>
            <select
              className="border rounded-lg px-3 py-1.5 text-sm min-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
              value={driverIdInput}
              onChange={(e) => setDriverIdInput(e.target.value)}
            >
              <option value="">Sélectionner un chauffeur</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id.toString()}>
                  #{d.id} — {d.name} ({d.phone})
                </option>
              ))}
            </select>
            {driversLoading && (
              <p className="mt-1 text-xs text-gray-500">Chargement des chauffeurs...</p>
            )}
            {driversError && (
              <p className="mt-1 text-xs text-red-600">{driversError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Du</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Au</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={handleLoadDriverStats}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90"
         >
            Charger les stats chauffeur
          </button>
        </div>

        {dailyLoading && <p className="text-sm text-gray-500">Chargement des statistiques du chauffeur...</p>}
        {dailyError && <p className="text-sm text-red-600 mb-2">{dailyError}</p>}

        {!dailyLoading && dailyStats.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Total courses', 'Complétées', 'Annulées', 'Volume brut', 'Commission', 'Gains driver'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {dailyStats.map((row) => (
                  <tr key={row.date}>
                    <td className="px-4 py-2">
                      {new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-4 py-2">{row.total_rides}</td>
                    <td className="px-4 py-2">{row.completed_rides}</td>
                    <td className="px-4 py-2">{row.cancelled_rides}</td>
                    <td className="px-4 py-2">{row.gross_volume.toLocaleString('fr-FR')} {row.currency}</td>
                    <td className="px-4 py-2">{row.commission_total.toLocaleString('fr-FR')} {row.currency}</td>
                    <td className="px-4 py-2">{row.earnings_total.toLocaleString('fr-FR')} {row.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!dailyLoading && driverId && dailyStats.length === 0 && !dailyError && (
          <p className="text-sm text-gray-500 mt-2">Aucune donnée pour ce chauffeur sur la période sélectionnée.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Top drivers par jour</h2>
        <p className="text-sm text-gray-500 mb-4">
          Classement quotidien des meilleurs chauffeurs sur la période sélectionnée.
        </p>

        {topLoading && <p className="text-sm text-gray-500">Chargement du classement des chauffeurs...</p>}
        {topError && <p className="text-sm text-red-600 mb-2">{topError}</p>}

        {!topLoading && topStats.length > 0 && (
          <div className="space-y-6 mt-4">
            {topStats.map((entry) => (
              <div key={entry.date} className="border rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="text-xs text-gray-500">
                    {entry.top.length} chauffeur(s)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white">
                      <tr>
                        {['Chauffeur', 'Téléphone', 'Courses complétées', 'Gains driver', 'Volume brut', 'Commission'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {entry.top.map((row) => (
                        <tr key={row.driver_id}>
                          <td className="px-4 py-2">{row.driver_name || `#${row.driver_id}`}</td>
                          <td className="px-4 py-2">{row.driver_phone || '—'}</td>
                          <td className="px-4 py-2">{row.completed_rides}</td>
                          <td className="px-4 py-2">{row.earnings_total.toLocaleString('fr-FR')} {row.currency}</td>
                          <td className="px-4 py-2">{row.gross_volume.toLocaleString('fr-FR')} {row.currency}</td>
                          <td className="px-4 py-2">{row.commission_total.toLocaleString('fr-FR')} {row.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {!topLoading && topStats.length === 0 && !topError && (
          <p className="text-sm text-gray-500 mt-2">Aucune donnée disponible pour la période sélectionnée.</p>
        )}
      </div>
    </div>
  );
}
