import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Users, CircleDot, DollarSign,
  Activity, AlertTriangle, UserCheck, Percent, Wallet, Timer, Target, ShieldAlert, Bell, RefreshCw,
  Hand, Hourglass, XCircle, UserX, Radar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { RevenueModal } from '@/components/CockpitModals';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

// --- Types ---
type ChangeType = 'positive' | 'negative' | 'neutral';
type Granularity = 'day' | 'week' | 'month';

interface OverviewData {
  today_completed_rides: number;
  today_completed_rides_delta_pct: number | null;
  today_revenue: { amount: number; currency: string };
  today_revenue_delta_pct: number | null;
  total_revenue: { amount: number; currency: string };
  online_drivers: number;
  active_rides: number;
  active_users_30d: number;
  acceptance_rate_pct: number | null;
  total_driver_debt: { amount: number; currency: string };
  avg_assignment_seconds: number | null;
}

interface TrendPoint { label: string; revenue: number; rides: number; new_users: number; }

interface SystemAlert {
  severity: 'critique' | 'elevee' | 'moyenne';
  code: string;
  title: string;
  detail: string;
}

interface DispatchData {
  dispatch: {
    avg_assignment_seconds: number | null;
    avg_pickup_seconds: number | null;
    refused_rides: number;
    expired_rides: number;
    cancelled_rides: number;
    no_driver_rides: number;
  };
}

// --- Helpers de formatage ---
const fmtXOF = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount);

const fmtDelta = (pct: number | null): { label: string; type: ChangeType } => {
  if (pct === null || pct === undefined) return { label: '—', type: 'neutral' };
  if (pct > 0) return { label: `+${pct}%`, type: 'positive' };
  if (pct < 0) return { label: `${pct}%`, type: 'negative' };
  return { label: '0%', type: 'neutral' };
};

const fmtDuration = (sec: number | null): string => {
  if (sec === null || sec === undefined) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
};

// --- Composants ---
const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-32 bg-white rounded-2xl border border-gray-100 shadow-sm" />
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-32">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
    <div className="h-80 bg-white rounded-2xl border border-gray-100 shadow-sm" />
  </div>
);

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: ChangeType;
  description?: string;
  colorTheme?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  onClick?: () => void;
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change, changeType, description, colorTheme = 'orange', onClick }) => {
  const themeStyles = {
    blue: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-shadow ${onClick ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-primary/30' : 'hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}{onClick && <span className="ml-1 text-[10px] text-primary">· détails</span>}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${themeStyles[colorTheme]}`}>
          <Icon size={24} />
        </div>
      </div>
      {(change || description) && (
        <div className="flex items-center gap-2 mt-4 text-sm">
          {change && (
            <span className={`flex items-center font-bold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
              {isPositive && <ArrowUpRight size={16} className="mr-0.5" />}
              {isNegative && <ArrowDownRight size={16} className="mr-0.5" />}
              {change}
            </span>
          )}
          {description && <span className="text-gray-500 text-xs">{description}</span>}
        </div>
      )}
    </div>
  );
};

// Panneau d'alertes classées (Bloc 5)
const severityConfig: Record<SystemAlert['severity'], { label: string; dot: string; box: string; text: string }> = {
  critique: { label: 'Critique', dot: 'bg-red-500', box: 'bg-red-50 border-red-200', text: 'text-red-700' },
  elevee: { label: 'Élevée', dot: 'bg-orange-500', box: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  moyenne: { label: 'Moyenne', dot: 'bg-yellow-500', box: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
};

const AlertsPanel: React.FC<{ alerts: SystemAlert[] }> = ({ alerts }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
    <div className="mb-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-gray-700" />
        <h3 className="text-lg font-bold text-gray-900">Alertes système</h3>
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${alerts.length === 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
        {alerts.length}
      </span>
    </div>
    <div className="flex-1 overflow-y-auto pr-1 space-y-3">
      {alerts.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center py-8 text-gray-400">
          <ShieldAlert size={32} className="mb-2" />
          <p className="text-sm font-medium">Aucune alerte active</p>
          <p className="text-xs">Système opérationnel</p>
        </div>
      ) : (
        alerts.map((a, i) => {
          const c = severityConfig[a.severity];
          return (
            <div key={`${a.code}-${i}`} className={`p-3 rounded-xl border ${c.box}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                <span className={`text-[10px] uppercase font-bold ${c.text}`}>{c.label}</span>
                <span className="text-sm font-bold text-gray-900">{a.title}</span>
              </div>
              <p className="text-xs text-gray-600 pl-4">{a.detail}</p>
            </div>
          );
        })
      )}
    </div>
  </div>
);

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dispatch, setDispatch] = useState<DispatchData['dispatch'] | null>(null);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const navigate = useNavigate();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const fetchCore = useCallback(async () => {
    setError(null);
    try {
      const [overviewRes, alertsRes, dispatchRes] = await Promise.all([
        api.get('/api/admin/stats/overview'),
        api.get('/api/admin/stats/alerts'),
        api.get('/api/admin/stats/dispatch'),
      ]);
      setOverview(overviewRes.data);
      setAlerts(alertsRes.data?.alerts ?? []);
      setDispatch(dispatchRes.data?.dispatch ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger le cockpit');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async (g: Granularity) => {
    setTrendsLoading(true);
    try {
      const res = await api.get(`/api/admin/stats/trends?granularity=${g}`);
      setTrends(res.data?.series ?? []);
    } catch {
      setTrends([]);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCore();
    const interval = setInterval(fetchCore, 30000); // rafraîchissement temps réel
    return () => clearInterval(interval);
  }, [fetchCore]);

  useEffect(() => {
    fetchTrends(granularity);
  }, [granularity, fetchTrends]);

  if (loading) return <DashboardSkeleton />;

  const nsDelta = fmtDelta(overview?.today_completed_rides_delta_pct ?? null);
  const revDelta = fmtDelta(overview?.today_revenue_delta_pct ?? null);

  const granularityTabs: { id: Granularity; label: string }[] = [
    { id: 'day', label: 'Jour' },
    { id: 'week', label: 'Semaine' },
    { id: 'month', label: 'Mois' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cockpit Opérationnel</h1>
          <p className="text-sm text-gray-500 mt-1">Vue en temps réel de l'activité Kêkênon.</p>
        </div>
        <button
          onClick={fetchCore}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {overview && (
        <>
          {/* 🌟 North Star Metric (20.14) */}
          <div
            onClick={() => navigate('/cockpit/rides/completed')}
            className="bg-primary text-gray-900 p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:brightness-110 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-black/10 flex items-center justify-center">
                <Target size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  North Star · Courses terminées aujourd'hui
                </p>
                <p className="text-4xl font-black mt-1 text-black">{overview.today_completed_rides}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center font-bold text-sm px-3 py-1.5 rounded-full ${
                nsDelta.type === 'positive' ? 'bg-black/10 text-gray-900' : nsDelta.type === 'negative' ? 'bg-red-500/20 text-red-900' : 'bg-black/5 text-gray-800'
              }`}>
                {nsDelta.type === 'positive' && <ArrowUpRight size={16} className="mr-1" />}
                {nsDelta.type === 'negative' && <ArrowDownRight size={16} className="mr-1" />}
                {nsDelta.label} <span className="font-normal ml-1 opacity-80">vs hier</span>
              </span>
            </div>
          </div>

          {/* Bloc 1 — KPI Temps Réel (les 7 autres) */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Chiffre d'affaires aujourd'hui"
              value={fmtXOF(overview.today_revenue.amount)}
              icon={DollarSign}
              change={revDelta.label}
              changeType={revDelta.type}
              description="vs hier"
              colorTheme="green"
            />
            <StatCard
              title="Chiffre d'affaires total"
              value={fmtXOF(overview.total_revenue.amount)}
              icon={DollarSign}
              description="depuis le lancement"
              colorTheme="green"
              onClick={() => setRevenueOpen(true)}
            />
            <StatCard title="Chauffeurs connectés" value={overview.online_drivers} icon={Users} colorTheme="orange" />
            <StatCard title="Courses en cours" value={overview.active_rides} icon={CircleDot} colorTheme="orange" />
            <StatCard title="Utilisateurs actifs" value={overview.active_users_30d} icon={UserCheck} description="30 derniers jours" colorTheme="purple" />
            <StatCard
              title="Taux d'acceptation"
              value={overview.acceptance_rate_pct !== null ? `${overview.acceptance_rate_pct}%` : '—'}
              icon={Percent}
              description="courses du jour"
              colorTheme={overview.acceptance_rate_pct !== null && overview.acceptance_rate_pct < 70 ? 'red' : 'green'}
            />
            <StatCard
              title="Dette totale chauffeurs"
              value={fmtXOF(overview.total_driver_debt.amount)}
              icon={Wallet}
              colorTheme={overview.total_driver_debt.amount > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Temps moyen d'attribution"
              value={fmtDuration(overview.avg_assignment_seconds)}
              icon={Timer}
              description="aujourd'hui"
              colorTheme="orange"
            />
          </div>
        </>
      )}

      {/* Bloc 3 — Monitoring Dispatch */}
      {dispatch && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Radar size={18} className="text-gray-700" />
            <h3 className="text-lg font-bold text-gray-900">Monitoring Dispatch</h3>
            <span className="text-xs text-gray-400">· aujourd'hui</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { icon: Timer, label: "Temps moyen d'attribution", value: fmtDuration(dispatch.avg_assignment_seconds), tone: 'text-amber-600 bg-amber-50' },
              { icon: Hourglass, label: 'Temps moyen de prise en charge', value: fmtDuration(dispatch.avg_pickup_seconds), tone: 'text-indigo-600 bg-indigo-50' },
              { icon: Hand, label: 'Courses refusées', value: dispatch.refused_rides, tone: 'text-orange-600 bg-orange-50', category: 'refused' },
              { icon: AlertTriangle, label: 'Courses expirées (timeout)', value: dispatch.expired_rides, tone: 'text-amber-600 bg-amber-50', category: 'expired' },
              { icon: XCircle, label: 'Courses annulées', value: dispatch.cancelled_rides, tone: 'text-red-600 bg-red-50', category: 'cancelled' },
              { icon: UserX, label: 'Sans chauffeur (en attente)', value: dispatch.no_driver_rides, tone: 'text-rose-600 bg-rose-50', category: 'no_driver' },
            ].map((m, i) => {
              const Icon = m.icon;
              const clickable = !!(m as { category?: string }).category;
              return (
                <div
                  key={i}
                  onClick={clickable ? () => navigate(`/cockpit/rides/${(m as { category: string }).category}`) : undefined}
                  className={`flex flex-col gap-2 p-3 rounded-xl border border-gray-100 ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 hover:shadow-sm transition-all' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 leading-none">{m.value}</p>
                  <p className="text-xs text-gray-500 leading-tight">{m.label}{clickable && <span className="ml-1 text-[10px] text-primary">· détails</span>}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            « Expirées » = courses passées en timeout (aucun chauffeur sous 10 min, expiration automatique). « Sans chauffeur » = demandes encore en attente d'attribution depuis plus de 5 min.
          </p>
        </div>
      )}

      {/* Bloc 2 (Évolution) + Bloc 5 (Alertes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Évolution de l'activité</h3>
              <p className="text-sm text-gray-500">Revenus, courses et nouveaux utilisateurs</p>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {granularityTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setGranularity(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    granularity === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`space-y-6 ${trendsLoading ? 'opacity-50' : ''}`}>
            {/* Revenus */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Revenus (XOF)</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `${v / 1000}k`} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: any) => [fmtXOF(v), 'Revenus']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courses + Nouveaux utilisateurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Courses terminées</p>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v: any) => [`${v} courses`, 'Courses']} />
                      <Bar dataKey="rides" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Nouveaux utilisateurs</p>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v: any) => [`${v} inscrits`, 'Nouveaux']} />
                      <Bar dataKey="new_users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloc 5 — Alertes */}
        <AlertsPanel alerts={alerts} />
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
        <Activity size={12} /> Cockpit mis à jour automatiquement toutes les 30 s
      </div>

      {revenueOpen && <RevenueModal onClose={() => setRevenueOpen(false)} />}
    </div>
  );
}
