import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Activity, TrendingDown, Users, AlertTriangle, RefreshCw } from 'lucide-react';

interface FunnelStep {
  key: string;
  label: string;
  count: number | null;
  tracked: boolean;
  step_conversion_pct: number | null;
}
interface FunnelData {
  period_days: number;
  events_tracked: boolean;
  steps: FunnelStep[];
  global_conversion_pct: number | null;
  abandonment_pct: number | null;
  dau: number;
  wau: number;
  mau: number;
}

const stepColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#0ea5e9', '#14b8a6', '#22c55e'];

export default function ProductAnalyticsPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/admin/analytics/funnel?days=${days}`);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger les analytics produit');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Base de référence pour la largeur des barres = première étape suivie non nulle
  const baseCount = data?.steps.find((s) => s.count && s.count > 0)?.count ?? 1;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Activity size={22} className="text-primary" /> Analytics produit
          </h1>
          <p className="text-sm text-gray-500 mt-1">Parcours utilisateur, conversion et rétention.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{d} j</button>
            ))}
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} /><p>{error}</p>
        </div>
      )}

      {data && !data.events_tracked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm">
          ⏳ Les étapes « Ouverture app » et « Recherche démarrée » s'activeront dès que la nouvelle version de l'app passager (avec le tracking) sera déployée et utilisée. Le reste du funnel est déjà réel.
        </div>
      )}

      {/* KPI rétention + conversion */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Conversion globale', value: data.global_conversion_pct != null ? `${data.global_conversion_pct}%` : '—', icon: Activity, tone: 'text-green-600 bg-green-50' },
            { label: "Taux d'abandon", value: data.abandonment_pct != null ? `${data.abandonment_pct}%` : '—', icon: TrendingDown, tone: 'text-red-600 bg-red-50' },
            { label: 'DAU', value: data.dau, icon: Users, tone: 'text-amber-600 bg-amber-50' },
            { label: 'WAU', value: data.wau, icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
            { label: 'MAU', value: data.mau, icon: Users, tone: 'text-purple-600 bg-purple-50' },
          ].map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.tone}`}><Icon size={18} /></div>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Funnel */}
      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Funnel produit</h3>
          <p className="text-sm text-gray-500 mb-5">De l'ouverture de l'app à la course terminée.</p>
          <div className="space-y-3">
            {data.steps.map((s, i) => {
              const width = s.count != null && baseCount > 0 ? Math.max((s.count / baseCount) * 100, 2) : 0;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-medium text-gray-700">{i + 1}. {s.label}</span>
                    <span className="text-gray-500">
                      {s.count != null ? s.count.toLocaleString('fr-FR') : 'non suivi'}
                      {s.step_conversion_pct != null && <span className="ml-2 text-xs text-gray-400">({s.step_conversion_pct}% vs étape préc.)</span>}
                    </span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    {s.count != null ? (
                      <div className="h-full rounded-lg flex items-center px-3 text-white text-xs font-bold transition-all" style={{ width: `${width}%`, backgroundColor: stepColors[i] }}>
                        {width > 12 ? s.count.toLocaleString('fr-FR') : ''}
                      </div>
                    ) : (
                      <div className="h-full flex items-center px-3 text-xs text-gray-400 italic">en attente du déploiement app</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Étapes 3 à 6 calculées depuis les courses · étapes 1-2 depuis les événements app</p>
    </div>
  );
}
