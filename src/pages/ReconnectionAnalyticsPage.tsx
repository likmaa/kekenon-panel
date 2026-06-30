import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';

interface ReconnectionEvent {
  id: number;
  user_id: number;
  ride_id: number | null;
  disconnected_at: string;
  reconnected_at: string;
  duration_ms: number;
  data_synced: boolean;
  sync_duration_ms: number | null;
  app_type: 'driver' | 'passenger';
  created_at: string;
}

interface ReconnectionStats {
  total: number;
  averageDuration: number; // en secondes
  averageSyncDuration: number; // en millisecondes
  successRate: number; // en pourcentage
  byAppType: {
    driver: number;
    passenger: number;
  };
  recentEvents: ReconnectionEvent[];
}

export default function ReconnectionAnalyticsPage() {
  const [stats, setStats] = useState<ReconnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/analytics/reconnections', {
        params: { period },
      });
      setStats(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Erreur lors de la récupération des analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Rafraîchir toutes les minutes
    return () => clearInterval(interval);
  }, [period]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-600" size={20} />
        <span className="text-red-800">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wifi className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Analytics de Reconnexion</h1>
            <p className="text-sm text-gray-500">Suivi des déconnexions et reconnexions automatiques</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="24h">24 dernières heures</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
          </select>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de reconnexions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total de reconnexions</span>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{stats?.total.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Sur la période sélectionnée</div>
        </div>

        {/* Durée moyenne */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Durée moyenne</span>
            <Clock className="text-orange-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {stats ? formatDuration(stats.averageDuration) : '0s'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Temps de déconnexion</div>
        </div>

        {/* Taux de succès */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Taux de succès</span>
            <CheckCircle className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats ? `${stats.successRate.toFixed(1)}%` : '0%'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Synchronisation réussie</div>
        </div>

        {/* Temps de sync */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Temps de sync</span>
            <RefreshCw className="text-purple-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {stats ? `${stats.averageSyncDuration.toFixed(0)}ms` : '0ms'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Moyenne de synchronisation</div>
        </div>
      </div>

      {/* Répartition par app */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Répartition par application</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">App Chauffeur</span>
                <span className="text-lg font-bold text-blue-600">{stats.byAppType.driver}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(stats.byAppType.driver / stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">App Passager</span>
                <span className="text-lg font-bold text-green-600">{stats.byAppType.passenger}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${(stats.byAppType.passenger / stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Événements récents */}
      {stats && stats.recentEvents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Événements récents</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">App</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Durée</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Sync</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(event.disconnected_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          event.app_type === 'driver'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {event.app_type === 'driver' ? 'Chauffeur' : 'Passager'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDuration(event.duration_ms / 1000)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {event.sync_duration_ms ? `${event.sync_duration_ms}ms` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {event.data_synced ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-xs">Réussi</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle size={16} />
                          <span className="text-xs">Échec</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Informations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Gestion automatique des reconnexions</h3>
            <p className="text-sm text-blue-800">
              Le système détecte automatiquement les pertes de connexion et synchronise les données
              dès que la connexion est rétablie. Les courses peuvent continuer en mode hors ligne
              et toutes les données sont sauvegardées localement.
            </p>
            {stats && (
              <p className="text-sm text-blue-700 mt-2">
                <strong>Performance :</strong> {stats.successRate.toFixed(1)}% des reconnexions
                se synchronisent avec succès en moyenne en {stats.averageSyncDuration.toFixed(0)}ms.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
