import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Activity, TrendingDown, Zap, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

interface MetricsData {
  total: number;
  apiCalls: number;
  websocketEvents: number;
  pollingTriggers: number;
  networkChanges: number;
  reduction: {
    pollingVsWebsocket: string;
  };
  period: {
    from: string;
    to: string;
  };
}

export default function PerformanceMetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/metrics', {
        params: { period },
      });
      setMetrics(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Erreur lors de la récupération des métriques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, [period]);

  if (loading && !metrics) {
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

  const reduction = metrics ? parseFloat(metrics.reduction.pollingVsWebsocket) : 0;
  const apiCallsReduction = metrics
    ? Math.round((metrics.pollingTriggers / (metrics.pollingTriggers + metrics.websocketEvents)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-primary" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Métriques de Performance</h1>
            <p className="text-sm text-gray-500">Suivi des appels API, WebSocket et polling</p>
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
            onClick={fetchMetrics}
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
        {/* Appels API */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Appels API</span>
            <Zap className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{metrics?.apiCalls.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Total sur la période</div>
        </div>

        {/* Événements WebSocket */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Événements WebSocket</span>
            <Wifi className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{metrics?.websocketEvents.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Temps réel</div>
        </div>

        {/* Polling déclenché */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Polling (fallback)</span>
            <RefreshCw className="text-orange-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{metrics?.pollingTriggers.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Seulement si WebSocket échoue</div>
        </div>

        {/* Réduction */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Réduction Polling</span>
            <TrendingDown className="text-green-600" size={20} />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {metrics ? `${(100 - apiCallsReduction).toFixed(1)}%` : '0%'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Utilisation WebSocket</div>
        </div>
      </div>

      {/* Graphique de comparaison */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Répartition des communications</h2>
        <div className="space-y-4">
          {/* Barre WebSocket */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">WebSocket (Temps réel)</span>
              <span className="text-sm text-gray-600">
                {metrics?.websocketEvents || 0} ({reduction.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${reduction}%` }}
              />
            </div>
          </div>

          {/* Barre Polling */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Polling (Fallback)</span>
              <span className="text-sm text-gray-600">
                {metrics?.pollingTriggers || 0} ({apiCallsReduction.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${apiCallsReduction}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Optimisation du polling</h3>
            <p className="text-sm text-blue-800">
              Le système utilise maintenant principalement WebSocket pour les mises à jour en temps réel.
              Le polling n'est utilisé qu'en fallback si WebSocket n'est pas disponible, réduisant
              significativement la charge serveur et la consommation de batterie.
            </p>
            {metrics && (
              <p className="text-sm text-blue-700 mt-2">
                <strong>Résultat :</strong> {reduction.toFixed(1)}% des communications passent par WebSocket,
                soit une réduction de ~{apiCallsReduction.toFixed(1)}% des appels API par rapport à l'ancien système.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
