import React, { useEffect, useState } from 'react';
import { DollarSign, ArrowUpRight, Download, Filter, Calendar, Users, Car } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/api/client';
import { exportToCsv } from '@/utils/exportCsv';

// --- Données Statiques pour les Finances (seed local, remplacées ensuite par l'API) ---
const initialTransactionsData: Transaction[] = [];
// -------------------------------------------------------------

// Interfaces et Types
type TransactionStatus = 'completed' | 'refunded' | 'pending';
interface Transaction {
  id: string;
  date: string;
  passenger: string;
  driver: string;
  amount: number;
  commission: number;
  driver_payout: number;
  status: TransactionStatus;
}

interface FinanceSummaryRange {
  from: string;
  to: string;
}

interface FinanceSummary {
  range: FinanceSummaryRange;
  gross_volume: number;
  net_revenue: number;
  commission_rate: number;
  rides_count: number;
  payouts_pending: number;
}

// Props pour les cartes de statistiques
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
}

// Composant pour les cartes de statistiques
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, change }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <Icon className="text-primary" size={22} />
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {change && <p className="text-xs text-green-600 flex items-center mt-2"><ArrowUpRight size={14} /> {change}</p>}
    </div>
  );
};

// Composant Badge de Statut pour les transactions
const TransactionStatusBadge = ({ status }: { status: TransactionStatus }) => {
  const config = {
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-blue-100 text-blue-800',
  };
  return <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${config[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

export default function FinancePage() {
  const [dateRange, setDateRange] = useState('last_7_days');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  // §20.9 — Pilotage financier
  type FinOverview = {
    ca_today: number; ca_week: number; ca_month: number;
    cash_payments: number; digital_payments: number; driver_payments: number; global_debt: number;
  };
  type FinReportRow = { label: string; rides_count: number; gross_volume: number; commission: number; driver_earnings: number; cash: number; digital: number; };
  const [finOverview, setFinOverview] = useState<FinOverview | null>(null);
  const [reportRows, setReportRows] = useState<FinReportRow[]>([]);
  const [reportGranularity, setReportGranularity] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactionsData);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const txPerPage = 20;

  // Commission local state
  const [commPlatform, setCommPlatform] = useState(0);
  const [commDriver, setCommDriver] = useState(0);
  const [commMaintenance, setCommMaintenance] = useState(0);
  const [commLoading, setCommLoading] = useState(false);
  const [commSaving, setCommSaving] = useState(false);
  const [commError, setCommError] = useState<string | null>(null);
  const [rideIdToConfirm, setRideIdToConfirm] = useState('');
  const [confirmRidePaymentLoading, setConfirmRidePaymentLoading] = useState(false);
  const [sandboxMessage, setSandboxMessage] = useState<string | null>(null);

  const fetchCommSettings = async () => {
    setCommLoading(true);
    try {
      const res = await api.get('/api/admin/settings');
      const data = res.data;
      setCommPlatform(data.commission_platform ?? 0);
      setCommDriver(data.commission_driver ?? 0);
      setCommMaintenance(data.commission_maintenance ?? 0);
    } catch (e) {
      console.error("Failed to fetch commission settings");
    } finally {
      setCommLoading(false);
    }
  };

  const handleSaveComm = async () => {
    const total = Number(commPlatform) + Number(commDriver) + Number(commMaintenance);
    if (total !== 100) {
      alert(`Le total doit être égal à 100%. Actuel: ${total}%`);
      return;
    }
    setCommSaving(true);
    setCommError(null);
    try {
      await api.post('/api/admin/settings', {
        commission_platform: commPlatform,
        commission_driver: commDriver,
        commission_maintenance: commMaintenance,
      });
      alert("Paramètres de commission mis à jour avec succès !");
    } catch (e: any) {
      setCommError(e?.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setCommSaving(false);
    }
  };

  const computeRange = (rangeKey: string): { from: string; to: string } => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (rangeKey) {
      case 'today': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month': {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_month': {
        const year = start.getFullYear();
        const month = start.getMonth();
        const firstOfThisMonth = new Date(year, month, 1, 0, 0, 0, 0);
        const lastMonthEnd = new Date(firstOfThisMonth.getTime() - 1);
        const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1, 0, 0, 0, 0);
        return {
          from: lastMonthStart.toISOString(),
          to: lastMonthEnd.toISOString(),
        };
      }
      case 'last_7_days':
      default: {
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  };

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = computeRange(dateRange);
        const res = await api.get('/api/admin/finance/summary', {
          params: { from, to },
        });
        setSummary(res.data as FinanceSummary);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Erreur de chargement des données financières');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    api.get('/api/admin/finance/overview').then((r) => setFinOverview(r.data)).catch(() => {});
    fetchCommSettings();
  }, [dateRange]);

  useEffect(() => {
    api.get(`/api/admin/finance/report?granularity=${reportGranularity}`)
      .then((r) => setReportRows(r.data?.rows ?? []))
      .catch(() => setReportRows([]));
  }, [reportGranularity]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get('/api/admin/finance/transactions', {
          params: { page: txPage, per_page: txPerPage },
        });
        const body = res.data as {
          data: Array<{ id: number | string; type: string; amount: number; currency: string; status: string; created_at: string }>;
          current_page: number;
          per_page: number;
          total: number;
        };

        const mapped: Transaction[] = body.data.map((item, index) => {
          const status: TransactionStatus = item.status === 'succeeded' ? 'completed' : 'pending';
          return {
            id: String(item.id),
            date: item.created_at,
            passenger: item.type === 'ride_payment' ? 'Course passager' : 'Prime chauffeur',
            driver: item.type === 'ride_payment' ? 'Course chauffeur' : 'Prime chauffeur',
            amount: item.amount,
            commission: (item as any).commission || 0,
            driver_payout: (item as any).payout || 0,
            status,
          };
        });

        setTransactions(mapped);
        setTxTotal(body.total);
      } catch (e) {
        // on garde les données initiales en cas d'erreur
      }
    };

    fetchTransactions();
  }, [txPage]);

  const handleConfirmRidePayment = async () => {
    const rideId = Number(rideIdToConfirm);
    if (!Number.isInteger(rideId) || rideId <= 0) {
      setSandboxMessage('Veuillez saisir un ID de course valide (nombre entier > 0).');
      return;
    }

    setConfirmRidePaymentLoading(true);
    setSandboxMessage(null);
    try {
      const res = await api.post('/api/admin/dev/rides/confirm-payment', { ride_id: rideId });
      setSandboxMessage(res.data?.message || 'Paiement confirmé.');
      setRideIdToConfirm('');
    } catch (e: any) {
      setSandboxMessage(e?.response?.data?.message || 'Erreur lors de la confirmation du paiement');
    } finally {
      setConfirmRidePaymentLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Finances et Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">Supervisez les flux financiers, les commissions et les paiements aux chauffeurs.</p>
      </header>

      {/* §20.9 — Pilotage financier : KPI + rapport + export */}
      {finOverview && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Pilotage financier</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              { label: "CA aujourd'hui", value: finOverview.ca_today, tone: 'text-green-700' },
              { label: 'CA semaine', value: finOverview.ca_week, tone: 'text-green-700' },
              { label: 'CA mois', value: finOverview.ca_month, tone: 'text-green-700' },
              { label: 'Paiements espèces', value: finOverview.cash_payments, tone: 'text-gray-900' },
              { label: 'Paiements digitaux', value: finOverview.digital_payments, tone: 'text-blue-700' },
              { label: 'Paiements chauffeurs', value: finOverview.driver_payments, tone: 'text-indigo-700' },
              { label: 'Dette globale', value: finOverview.global_debt, tone: finOverview.global_debt > 0 ? 'text-red-600' : 'text-gray-900' },
            ].map((k, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-3">
                <p className={`text-lg font-bold ${k.tone}`}>{k.value.toLocaleString('fr-FR')} F</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Rapport financier</h3>
              <div className="flex gap-2 items-center">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {([['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setReportGranularity(id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reportGranularity === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportToCsv(
                    `rapport-financier-${reportGranularity}`,
                    ['Période', 'Courses', 'CA brut', 'Commission', 'Gains chauffeurs', 'Espèces', 'Digital'],
                    reportRows.map((r) => [r.label, r.rides_count, r.gross_volume, r.commission, r.driver_earnings, r.cash, r.digital]),
                  )}
                  disabled={reportRows.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
                >
                  Imprimer / PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Période', 'Courses', 'CA brut', 'Commission', 'Gains chauffeurs', 'Espèces', 'Digital'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.label}</td>
                      <td className="px-3 py-2 text-gray-600">{r.rides_count}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{r.gross_volume.toLocaleString('fr-FR')} F</td>
                      <td className="px-3 py-2 text-emerald-700">{r.commission.toLocaleString('fr-FR')} F</td>
                      <td className="px-3 py-2 text-indigo-700">{r.driver_earnings.toLocaleString('fr-FR')} F</td>
                      <td className="px-3 py-2 text-gray-600">{r.cash.toLocaleString('fr-FR')} F</td>
                      <td className="px-3 py-2 text-blue-700">{r.digital.toLocaleString('fr-FR')} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && !summary && (
        <p className="text-sm text-gray-500">Chargement des données financières...</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Section des KPIs (Indicateurs Clés de Performance) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires total"
          value={summary ? `${summary.gross_volume.toLocaleString('fr-FR')} FCFA` : '—'}
          icon={DollarSign}
        />
        <StatCard
          title="Commissions perçues"
          value={summary ? `${summary.net_revenue.toLocaleString('fr-FR')} FCFA` : '—'}
          icon={DollarSign}
        />
        <StatCard
          title="Paiements aux chauffeurs"
          value={summary ? `${(summary.gross_volume - summary.net_revenue).toLocaleString('fr-FR')} FCFA` : '—'}
          icon={Car}
        />
        <StatCard
          title="Transactions"
          value={summary ? summary.rides_count : '—'}
          icon={Users}
        />
      </div>

      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
        <p className="font-semibold text-emerald-900 mb-1">Sandbox paiement course</p>
        <p className="text-sm text-emerald-800 mb-3">
          Confirme manuellement le paiement d’une course pour débloquer le bouton « Terminer » côté passager.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            min={1}
            value={rideIdToConfirm}
            onChange={(e) => setRideIdToConfirm(e.target.value)}
            placeholder="ID de course (ex: 123)"
            className="w-full sm:w-64 border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleConfirmRidePayment}
            disabled={confirmRidePaymentLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {confirmRidePaymentLoading ? 'Confirmation...' : 'Confirmer paiement course'}
          </button>
        </div>
        {sandboxMessage && <p className="text-xs text-emerald-900 mt-2">{sandboxMessage}</p>}
      </div>

      {/* Paramètres de Commission (Developer Only) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de Commission (%)</h2>
        {commLoading ? (
          <p className="text-sm text-gray-500">Chargement des paramètres...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Plateforme (%)</label>
              <input
                type="number"
                value={commPlatform}
                onChange={(e) => setCommPlatform(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Chauffeur (%)</label>
              <input
                type="number"
                value={commDriver}
                onChange={(e) => setCommDriver(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Maintenance (%)</label>
              <input
                type="number"
                value={commMaintenance}
                onChange={(e) => setCommMaintenance(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <button
                onClick={handleSaveComm}
                disabled={commSaving}
                className="w-full px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {commSaving ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        )}
        {commError && <p className="text-sm text-red-600 mt-2">{commError}</p>}
        <p className="text-xs text-gray-400 mt-3 italic">
          * Le total des trois pourcentages doit impérativement être égal à 100%. Ces valeurs impactent directement le calcul des gains lors de la complétion d'une course.
        </p>
      </div>

      {/* Carte principale pour la liste des transactions */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {/* Barre d'outils : Filtres et Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Historique des Transactions</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full md:w-auto pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="today">Aujourd'hui</option>
                <option value="last_7_days">7 derniers jours</option>
                <option value="this_month">Ce mois-ci</option>
                <option value="last_month">Mois dernier</option>
              </select>
            </div>
            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={16} />
              Exporter en CSV
            </button>
          </div>
        </div>

        {/* Tableau des transactions */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['ID Transaction', 'Date', 'Passager', 'Chauffeur', 'Montant Total', 'Commission', 'Paiement Chauffeur', 'Statut'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{tx.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.passenger}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.driver}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900">{tx.amount.toFixed(2)} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{tx.commission.toFixed(2)} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">{tx.driver_payout.toFixed(2)} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap"><TransactionStatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
