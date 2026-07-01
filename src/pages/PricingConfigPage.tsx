import React, { useEffect, useState } from 'react';
import { DollarSign, Map, Clock, Zap, Save, Loader2, CloudRain, Moon, Coffee } from 'lucide-react';
import { api } from '@/api/client';

// Interface pour la configuration
interface PricingConfig {
  base_fare: number;
  per_km: number;
  per_min: number;
  min_fare: number;
  stop_rate_per_min: number;
  peak_hours: {
    enabled: boolean;
    multiplier: number;
    start_time: string;
    end_time: string;
  };
  weather: {
    enabled: boolean;
    multiplier: number;
  };
  night: {
    multiplier: number;
    start_time: string;
    end_time: string;
  };
  out_of_city: {
    enabled: boolean;
    multiplier: number;
    min_fare: number;
    inner_city_lat: number;
    inner_city_lng: number;
    inner_city_radius_km: number;
  };
  pickup_grace_period_m: number;
  pickup_waiting_rate_per_min: number;
}

// Props typées pour le composant PricingInput
interface PricingInputProps {
  label: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  description?: string;
}

// Composant réutilisable pour un champ de formulaire de tarification
const PricingInput: React.FC<PricingInputProps> = ({ label, value, onChange, unit, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="relative mt-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <span className="text-gray-500 sm:text-sm">{unit}</span>
      </div>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        className="w-full rounded-md border-gray-300 pl-7 pr-12 py-2 text-right shadow-sm focus:border-primary focus:ring-primary"
      />
    </div>
    {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
  </div>
);

export default function PricingConfigPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/admin/pricing');
        const data = res.data as any;
        setConfig({
          base_fare: Number(data.base_fare ?? 500),
          per_km: Number(data.per_km ?? 250),
          per_min: Number(data.per_min ?? 5),
          min_fare: Number(data.min_fare ?? 1000),
          stop_rate_per_min: Number(data.stop_rate_per_min ?? 5),
          peak_hours: {
            enabled: Boolean(data.peak_hours?.enabled ?? false),
            multiplier: Number(data.peak_hours?.multiplier ?? 1.0),
            start_time: data.peak_hours?.start_time ?? '17:00',
            end_time: data.peak_hours?.end_time ?? '20:00',
          },
          weather: {
            enabled: Boolean(data.weather?.enabled ?? false),
            multiplier: Number(data.weather?.multiplier ?? 1.0),
          },
          night: {
            multiplier: Number(data.night?.multiplier ?? 1.0),
            start_time: data.night?.start_time ?? '22:00',
            end_time: data.night?.end_time ?? '06:00',
          },
          out_of_city: {
            enabled: Boolean(data.out_of_city?.enabled ?? false),
            multiplier: Number(data.out_of_city?.multiplier ?? 1.5),
            min_fare: Number(data.out_of_city?.min_fare ?? 1500),
            inner_city_lat: Number(data.out_of_city?.inner_city_lat ?? 6.4969),
            inner_city_lng: Number(data.out_of_city?.inner_city_lng ?? 2.6289),
            inner_city_radius_km: Number(data.out_of_city?.inner_city_radius_km ?? 15),
          },
          pickup_grace_period_m: Number(data.pickup_grace_period_m ?? 5),
          pickup_waiting_rate_per_min: Number(data.pickup_waiting_rate_per_min ?? 10),
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || "Erreur de chargement de la configuration tarifaire");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.put('/api/admin/pricing', config);
      // Success visual feedback could be added here (e.g., toast)
    } catch (e: any) {
      setError(e?.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Tarifaire</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez la formule de calcul et les multiplicateurs dynamiques.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-2.5 bg-primary text-marine rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400 font-bold"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder les changements'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <Zap size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Section 1: Tarification de Base & Arrêts */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <DollarSign className="text-primary" size={24} />
                <h2 className="text-lg font-semibold text-gray-900">Tarification Standard (Distance)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PricingInput
                  label="Prise en charge"
                  unit="FCFA"
                  value={config.base_fare}
                  onChange={e => setConfig({ ...config, base_fare: parseFloat(e.target.value) })}
                  description="Montant fixe au départ."
                />
                <PricingInput
                  label="Prix au kilomètre"
                  unit="FCFA"
                  value={config.per_km}
                  onChange={e => setConfig({ ...config, per_km: parseFloat(e.target.value) })}
                  description="Facturé selon la distance OSRM."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PricingInput
                  label="Prix à la minute"
                  unit="F/min"
                  value={config.per_min}
                  onChange={e => setConfig({ ...config, per_min: parseInt(e.target.value) })}
                  description="Temps de course après prise en charge (hors arrêts)."
                />
                <PricingInput
                  label="Tarif minimum"
                  unit="FCFA"
                  value={config.min_fare}
                  onChange={e => setConfig({ ...config, min_fare: parseFloat(e.target.value) })}
                  description="Montant minimum d'une course (hors temps d'arrêt)."
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Coffee className="text-orange-500" size={24} />
                <h2 className="text-lg font-semibold text-gray-900">Frais d'Attente (Arrêts)</h2>
              </div>
              <PricingInput
                label="Prix de l'arrêt"
                unit="FCFA/min"
                value={config.stop_rate_per_min}
                onChange={e => setConfig({ ...config, stop_rate_per_min: parseFloat(e.target.value) })}
                description="Facturé uniquement quand le chauffeur active le bouton 'Arrêt'."
              />
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-600" size={24} />
                <h2 className="text-lg font-semibold text-gray-900">Attente à la Prise en Charge</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PricingInput
                  label="Délai de grâce"
                  unit="min"
                  value={config.pickup_grace_period_m}
                  onChange={e => setConfig({ ...config, pickup_grace_period_m: parseInt(e.target.value) })}
                  description="Nb de minutes gratuites après l'arrivée."
                />
                <PricingInput
                  label="Tarif attente"
                  unit="F/min"
                  value={config.pickup_waiting_rate_per_min}
                  onChange={e => setConfig({ ...config, pickup_waiting_rate_per_min: parseInt(e.target.value) })}
                  description="Chaque minute supplémentaire."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multiplicateurs Dynamiques */}
          <div className="space-y-6">
            {/* Heures de pointe */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="text-amber-500" size={24} />
                  <h2 className="text-lg font-semibold text-gray-900">Heures de Pointe</h2>
                </div>
                <input
                  type="checkbox"
                  checked={config.peak_hours.enabled}
                  onChange={e => setConfig({ ...config, peak_hours: { ...config.peak_hours, enabled: e.target.checked } })}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
              {config.peak_hours.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <PricingInput
                    label="Multiplicateur"
                    unit="x"
                    value={config.peak_hours.multiplier}
                    onChange={e => setConfig({ ...config, peak_hours: { ...config.peak_hours, multiplier: parseFloat(e.target.value) } })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Début</label>
                    <input type="time" value={config.peak_hours.start_time} onChange={e => setConfig({ ...config, peak_hours: { ...config.peak_hours, start_time: e.target.value } })} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fin</label>
                    <input type="time" value={config.peak_hours.end_time} onChange={e => setConfig({ ...config, peak_hours: { ...config.peak_hours, end_time: e.target.value } })} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Mode Nuit */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <Moon className="text-indigo-600" size={24} />
                <h2 className="text-lg font-semibold text-gray-900">Tarif de Nuit</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PricingInput
                  label="Multiplicateur"
                  unit="x"
                  value={config.night.multiplier}
                  onChange={e => setConfig({ ...config, night: { ...config.night, multiplier: parseFloat(e.target.value) } })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">Début de nuit</label>
                  <input type="time" value={config.night.start_time} onChange={e => setConfig({ ...config, night: { ...config.night, start_time: e.target.value } })} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fin de nuit</label>
                  <input type="time" value={config.night.end_time} onChange={e => setConfig({ ...config, night: { ...config.night, end_time: e.target.value } })} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                </div>
              </div>
            </div>

            {/* Mode Hors Zone (Cotonou, etc.) */}
            <div className={`p-6 rounded-xl border transition-all ${config.out_of_city.enabled ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'} shadow-sm space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Map className={config.out_of_city.enabled ? 'text-orange-600' : 'text-gray-400'} size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">Hors Zone (Inter-urbain)</h3>
                </div>
                <button
                  onClick={() => setConfig({ ...config, out_of_city: { ...config.out_of_city, enabled: !config.out_of_city.enabled } })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${config.out_of_city.enabled ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {config.out_of_city.enabled ? 'ACTIF' : 'ACTIVER'}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Applique une majoration si le départ ou l'arrivée est hors de Porto-Novo.
              </p>
              {config.out_of_city.enabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PricingInput
                      label="Multiplicateur"
                      unit="x"
                      value={config.out_of_city.multiplier}
                      onChange={e => setConfig({ ...config, out_of_city: { ...config.out_of_city, multiplier: parseFloat(e.target.value) } })}
                    />
                    <PricingInput
                      label="Tarif Min. Hors Zone"
                      unit="FCFA"
                      value={config.out_of_city.min_fare}
                      onChange={e => setConfig({ ...config, out_of_city: { ...config.out_of_city, min_fare: parseInt(e.target.value) } })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <PricingInput
                      label="Rayon Urbain"
                      unit="km"
                      value={config.out_of_city.inner_city_radius_km}
                      onChange={e => setConfig({ ...config, out_of_city: { ...config.out_of_city, inner_city_radius_km: parseInt(e.target.value) } })}
                      description="Rayon autour du centre."
                    />
                    <PricingInput
                      label="Centre Lat"
                      value={config.out_of_city.inner_city_lat}
                      onChange={e => setConfig({ ...config, out_of_city: { ...config.out_of_city, inner_city_lat: parseFloat(e.target.value) } })}
                    />
                    <PricingInput
                      label="Centre Lng"
                      value={config.out_of_city.inner_city_lng}
                      onChange={e => setConfig({ ...config, out_of_city: { ...config.out_of_city, inner_city_lng: parseFloat(e.target.value) } })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mode Météo (Bouton d'urgence) */}
            <div className={`p-6 rounded-xl border transition-all ${config.weather.enabled ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'} shadow-sm space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CloudRain className={config.weather.enabled ? 'text-amber-600' : 'text-gray-400'} size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">Mode Pluie / Intempéries</h3>
                </div>
                <button
                  onClick={() => setConfig({ ...config, weather: { ...config.weather, enabled: !config.weather.enabled } })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${config.weather.enabled ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {config.weather.enabled ? 'ACTIF' : 'ACTIVER'}
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Activez ce mode manuellement lors de fortes pluies pour appliquer une majoration immédiate sur toutes les courses.
              </p>
              {config.weather.enabled && (
                <PricingInput
                  label="Multiplicateur Pluie"
                  unit="x"
                  value={config.weather.multiplier}
                  onChange={e => setConfig({ ...config, weather: { ...config.weather, multiplier: parseFloat(e.target.value) } })}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

