import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Users, CircleDot, DollarSign,
  Activity, AlertTriangle, UserCheck, Percent, Timer, Target, ShieldAlert, Bell, RefreshCw,
  Hand, Hourglass, XCircle, UserX, Radar, Car, Package, CheckCircle2
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
  avg_assignment_seconds: number | null;
}

interface TrendPoint { label: string; revenue: number; rides: number; deliveries: number; new_users: number; }

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
  courses: ActivityStats;
  deliveries: ActivityStats;
}

interface ActivityStats {
  completed_count: number;
  active_count: number;
  cancelled_count: number;
  avg_duration_seconds: number | null;
  avg_distance_m: number | null;
  avg_fare_amount: number | null;
  cancellation_rate_pct: number | null;
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

const fmtAverageAmount = (amount: number | null): string =>
  amount === null || amount === undefined ? '—' : fmtXOF(amount);

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
  colorTheme?: 'green' | 'amber' | 'red' | 'neutral';
  onClick?: () => void;
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change, changeType, description, colorTheme = 'amber', onClick }) => {
  const themeStyles = {
    green: 'bg-brand-green/10 text-brand-green-dark ring-1 ring-brand-green/20',
    amber: 'bg-primary/20 text-amber-800 ring-1 ring-primary/30',
    red: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    neutral: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
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
  elevee: { label: 'Élevée', dot: 'bg-red-400', box: 'bg-red-50 border-red-100', text: 'text-red-700' },
  moyenne: { label: 'Moyenne', dot: 'bg-primary-dark', box: 'bg-primary/10 border-primary/30', text: 'text-amber-800' },
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

const ActivityStatsPanel: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  stats: ActivityStats;
  theme: 'course' | 'delivery';
}> = ({ title, subtitle, icon: Icon, stats, theme }) => {
  const colors = theme === 'course'
    ? {
        shell: 'border-brand-green/30 bg-gradient-to-br from-brand-green/10 to-white',
        icon: 'bg-brand-green text-white',
        accent: 'text-brand-green-dark',
      }
    : {
        shell: 'border-primary/50 bg-gradient-to-br from-primary/15 to-white',
        icon: 'bg-primary text-dark',
        accent: 'text-amber-800',
      };

  const metrics = theme === 'course'
    ? [
        { label: 'En cours', value: stats.active_count, icon: CircleDot },
        { label: 'Terminées', value: stats.completed_count, icon: CheckCircle2 },
        { label: 'Distance moyenne', value: stats.avg_distance_m === null ? '—' : `${(stats.avg_distance_m / 1000).toFixed(1)} km`, icon: Activity },
        { label: 'Montant moyen', value: fmtAverageAmount(stats.avg_fare_amount), icon: DollarSign },
      ]
    : [
        { label: 'En cours', value: stats.active_count, icon: CircleDot },
        { label: 'Terminées', value: stats.completed_count, icon: CheckCircle2 },
        { label: 'Annulées', value: stats.cancelled_count, icon: XCircle },
        { label: 'Montant moyen', value: fmtAverageAmount(stats.avg_fare_amount), icon: DollarSign },
      ];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors.shell}`}>
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${colors.icon}`}>
          <Icon size={22} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-white/80 bg-white/85 p-3 shadow-sm">
              <div className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${colors.accent}`}>
                <MetricIcon size={14} />
                <span>{metric.label}</span>
              </div>
              <p className="text-xl font-black text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dispatch, setDispatch] = useState<DispatchData['dispatch'] | null>(null);
  const [courseStats, setCourseStats] = useState<ActivityStats | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<ActivityStats | null>(null);
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
      setCourseStats(dispatchRes.data?.courses ?? null);
      setDeliveryStats(dispatchRes.data?.deliveries ?? null);
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

          {/* Synthèse générale, sans répéter les indicateurs du monitoring */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
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
            <StatCard title="Zems connectés" value={overview.online_drivers} icon={Users} colorTheme="amber" />
            <StatCard title="Utilisateurs actifs" value={overview.active_users_30d} icon={UserCheck} description="30 derniers jours" colorTheme="neutral" />
            <StatCard
              title="Taux d'acceptation"
              value={overview.acceptance_rate_pct !== null ? `${overview.acceptance_rate_pct}%` : '—'}
              icon={Percent}
              description="courses du jour"
              colorTheme={overview.acceptance_rate_pct !== null && overview.acceptance_rate_pct < 70 ? 'red' : 'green'}
            />
          </div>
        </>
      )}

      {courseStats && deliveryStats && (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-gray-900">Activités du jour</h2>
            <p className="text-sm text-gray-500">Les courses zem et les livraisons sont calculées séparément.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ActivityStatsPanel
              title="Courses zem"
              subtitle="Transport de passagers"
              icon={Car}
              stats={courseStats}
              theme="course"
            />
            <ActivityStatsPanel
              title="Livraisons"
              subtitle="Colis et courses de livraison"
              icon={Package}
              stats={deliveryStats}
              theme="delivery"
            />
          </div>
        </section>
      )}

      {/* Bloc 3 — Monitoring Dispatch */}
      {dispatch && (
        <div className="bg-white p-6 rounded-2xl border border-primary/25 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-amber-800">
              <Radar size={18} />
            </span>
            <h3 className="text-lg font-bold text-gray-900">Monitoring dispatch zem</h3>
            <span className="text-xs text-gray-400">· aujourd'hui</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { icon: Timer, label: "Temps moyen d'attribution", value: fmtDuration(dispatch.avg_assignment_seconds), tone: 'text-gray-700 bg-gray-100' },
              { icon: Hourglass, label: 'Temps moyen de prise en charge', value: fmtDuration(dispatch.avg_pickup_seconds), tone: 'text-brand-green-dark bg-brand-green/10' },
              { icon: Hand, label: 'Courses refusées', value: dispatch.refused_rides, tone: 'text-amber-800 bg-primary/15', category: 'refused' },
              { icon: AlertTriangle, label: 'Courses expirées (timeout)', value: dispatch.expired_rides, tone: 'text-red-600 bg-red-50', category: 'expired' },
              { icon: XCircle, label: 'Courses annulées', value: dispatch.cancelled_rides, tone: 'text-red-600 bg-red-50', category: 'cancelled' },
              { icon: UserX, label: 'Sans zem (en attente)', value: dispatch.no_driver_rides, tone: 'text-red-600 bg-red-50', category: 'no_driver' },
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
            « Expirées » = courses passées en timeout (aucun zem sous 10 min, expiration automatique). « Sans zem » = demandes encore en attente d'attribution depuis plus de 5 min.
          </p>
        </div>
      )}

      {/* Bloc 2 (Évolution) + Bloc 5 (Alertes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Évolution de l'activité</h3>
              <p className="text-sm text-gray-500">Revenus, courses zem, livraisons et nouveaux utilisateurs</p>
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
                    <Line type="monotone" dataKey="revenue" stroke="#37BD6B" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Courses + Nouveaux utilisateurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Activités terminées</p>
                <div className="h-[170px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 5, right: 0, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <RechartsTooltip
                        cursor={{ fill: '#F3F4F6' }}
                        contentStyle={{ borderRadius: '12px', border: 'none' }}
                        formatter={(v: any, name: any) => [`${v}`, name === 'rides' ? 'Courses zem' : 'Livraisons']}
                      />
                      <Bar dataKey="rides" fill="#37BD6B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="deliveries" fill="#FDD835" radius={[4, 4, 0, 0]} />
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
                      <Bar dataKey="new_users" fill="#4B5563" radius={[4, 4, 0, 0]} />
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
