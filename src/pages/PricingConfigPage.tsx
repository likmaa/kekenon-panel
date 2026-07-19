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
  business_model: {
    driver_ride_share_pct: number;
    passenger_app_fee: number;
    driver_pack_price: number;
    driver_pack_rides: number;
    driver_effective_fee_per_ride: number;
    expected_platform_revenue_per_ride: number;
  };
  delivery: {
    small_fee: number;
    medium_fee: number;
    large_fee: number;
    fragile_fee: number;
    weight_threshold_kg: number;
    extra_kg_fee: number;
  };
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
          business_model: {
            driver_ride_share_pct: 100,
            passenger_app_fee: Number(data.business_model?.passenger_app_fee ?? 50),
            driver_pack_price: Number(data.business_model?.driver_pack_price ?? 500),
            driver_pack_rides: Number(data.business_model?.driver_pack_rides ?? 10),
            driver_effective_fee_per_ride: Number(data.business_model?.driver_effective_fee_per_ride ?? 50),
            expected_platform_revenue_per_ride: Number(data.business_model?.expected_platform_revenue_per_ride ?? 100),
          },
          delivery: {
            small_fee: Number(data.delivery?.small_fee ?? 0),
            medium_fee: Number(data.delivery?.medium_fee ?? 200),
            large_fee: Number(data.delivery?.large_fee ?? 500),
            fragile_fee: Number(data.delivery?.fragile_fee ?? 200),
            weight_threshold_kg: Number(data.delivery?.weight_threshold_kg ?? 5),
            extra_kg_fee: Number(data.delivery?.extra_kg_fee ?? 100),
          },
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

          <div className="lg:col-span-2 bg-gradient-to-br from-emerald-700 to-emerald-600 p-6 rounded-2xl text-white shadow-sm overflow-hidden relative">
            <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="relative space-y-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">modèle économique actif</p>
                  <h2 className="mt-1 text-2xl font-bold">le zem garde 100 % du prix de la course</h2>
                  <p className="mt-2 max-w-3xl text-sm text-emerald-50/90">
                    Kêkênon se rémunère séparément avec les frais d’application passager et le pack de courses du zem. Aucune commission proportionnelle n’est retirée du tarif.
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 px-4 py-3 text-right backdrop-blur-sm">
                  <p className="text-xs text-emerald-100">revenu théorique / course</p>
                  <p className="text-2xl font-bold">
                    {(config.business_model.passenger_app_fee + (config.business_model.driver_pack_price / Math.max(1, config.business_model.driver_pack_rides))).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} F
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white p-4 text-gray-900">
                  <PricingInput
                    label="Frais application passager"
                    unit="FCFA"
                    value={config.business_model.passenger_app_fee}
                    onChange={e => setConfig({ ...config, business_model: { ...config.business_model, passenger_app_fee: parseInt(e.target.value) || 0 } })}
                    description="Tarif normal : 50 F. Ramenez ce montant à 25 F uniquement pendant une promotion."
                  />
                </div>
                <div className="rounded-xl bg-white p-4 text-gray-900">
                  <PricingInput
                    label="Prix du pack zem"
                    unit="FCFA"
                    value={config.business_model.driver_pack_price}
                    onChange={e => setConfig({ ...config, business_model: { ...config.business_model, driver_pack_price: parseInt(e.target.value) || 0 } })}
                    description="Débité au renouvellement du pack."
                  />
                </div>
                <div className="rounded-xl bg-white p-4 text-gray-900">
                  <PricingInput
                    label="Courses par pack"
                    unit="courses"
                    value={config.business_model.driver_pack_rides}
                    onChange={e => setConfig({ ...config, business_model: { ...config.business_model, driver_pack_rides: Math.max(1, parseInt(e.target.value) || 1) } })}
                    description={`Coût effectif : ${(config.business_model.driver_pack_price / Math.max(1, config.business_model.driver_pack_rides)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} F/course.`}
                  />
                </div>
              </div>
            </div>
          </div>

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
                description="Facturé uniquement quand le zem active le bouton 'Arrêt'."
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

          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">suppléments livraison</h2>
              <p className="text-sm text-gray-500">Ajoutés à la grille zem standard selon le colis déclaré.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {([
                ['small_fee', 'Petit colis', 'Enveloppe ou petit paquet.'],
                ['medium_fee', 'Colis moyen', 'Format standard de livraison.'],
                ['large_fee', 'Grand colis', 'Format encombrant accepté sur zem.'],
                ['fragile_fee', 'Option fragile', 'Manipulation renforcée.'],
                ['weight_threshold_kg', 'Poids inclus', 'Seuil avant supplément par kilo.'],
                ['extra_kg_fee', 'Kilo supplémentaire', 'Facturé par kilo entier au-delà du seuil.'],
              ] as const).map(([key, label, description]) => (
                <PricingInput
                  key={key}
                  label={label}
                  unit={key === 'weight_threshold_kg' ? 'kg' : 'FCFA'}
                  value={config.delivery[key]}
                  onChange={e => setConfig({
                    ...config,
                    delivery: { ...config.delivery, [key]: Math.max(0, parseInt(e.target.value) || 0) },
                  })}
                  description={description}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">simulation de la grille standard</h2>
                <p className="text-sm text-gray-500">Hors attente, bagage, promotion et majoration dynamique.</p>
              </div>
              <span className="text-xs font-semibold text-gray-500 rounded-full bg-gray-100 px-3 py-1.5">arrondi aux 100 F à la fin de la course</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'course courte', km: 1, min: 5 },
                { label: 'course moyenne', km: 3, min: 10 },
                { label: 'course longue', km: 5, min: 15 },
              ].map(sample => {
                const trajectory = Math.max(config.min_fare, config.base_fare + sample.km * config.per_km);
                const fare = Math.ceil((trajectory + sample.min * config.per_min) / 100) * 100;
                return (
                  <div key={sample.label} className="rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{sample.label}</p>
                    <p className="mt-1 text-sm text-gray-600">{sample.km} km · {sample.min} min</p>
                    <p className="mt-3 text-2xl font-bold text-gray-900">{fare.toLocaleString('fr-FR')} F</p>
                    <p className="mt-1 text-xs text-emerald-700">zem : {fare.toLocaleString('fr-FR')} F avant promotion</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
