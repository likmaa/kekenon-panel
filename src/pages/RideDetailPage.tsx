import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, MapPin, Clock, User, Car, CreditCard, Loader2, Gauge } from 'lucide-react';
import { api } from '@/api/client';

interface RideDetail {
  id: number;
  status: string;
  cancellation_reason: string | null;
  passenger_name: string | null;
  passenger_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  approach_km: number | null;
  ride_km: number | null;
  duration_min: number | null;
  vehicle_type: string | null;
  payment_method: string | null;
  payment_status: string | null;
  fare: number;
  original_fare: number;
  discount_amount: number;
  breakdown: Record<string, number> | null;
  created_at: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Terminée', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Annulée', cls: 'bg-red-50 text-red-700' },
  requested: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces', wallet: 'Portefeuille', mobile_money: 'Mobile Money', card: 'Carte', qr: 'QR',
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: string }> = ({ icon, label, value, tone }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
    <div className={`inline-flex p-2 rounded-lg ${tone} mb-3`}>{icon}</div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const FareLine: React.FC<{ label: string; value: number; bold?: boolean; sub?: string }> = ({ label, value, bold, sub }) => (
  <div className={`flex justify-between items-center py-2.5 ${bold ? '' : 'border-b border-dashed border-gray-100'}`}>
    <div>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-600'}>{label}</span>
      {sub && <span className="block text-xs text-gray-400">{sub}</span>}
    </div>
    <span className={`tabular-nums ${bold ? 'font-bold text-gray-900 text-lg' : 'font-medium text-gray-800'}`}>{value.toLocaleString('fr-FR')} F</span>
  </div>
);

export default function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/api/admin/stats/dispatch/rides/${id}`)
      .then((r) => { if (active) setRide(r.data); })
      .catch(() => { if (active) setError("Course introuvable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="p-10 flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Chargement…</div>;
  }
  if (error || !ride) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 mb-4"><ArrowLeft size={22} /></button>
        <p className="text-gray-500">{error || 'Course introuvable.'}</p>
      </div>
    );
  }

  const st = STATUS_LABELS[ride.status] ?? { label: ride.status, cls: 'bg-gray-100 text-gray-600' };
  const bd = ride.breakdown ?? {};
  const timeline: { label: string; at: string | null }[] = [
    { label: 'Demande créée', at: ride.created_at },
    { label: 'Chauffeur a accepté', at: ride.accepted_at },
    { label: 'Arrivé au point de prise en charge', at: ride.arrived_at },
    { label: 'Prise en charge (départ)', at: ride.started_at },
    { label: ride.status === 'cancelled' ? 'Annulée' : 'Terminée', at: ride.completed_at ?? ride.cancelled_at },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={22} /></button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Course #{ride.id}</h1>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span>
        {ride.cancellation_reason && <span className="text-xs text-gray-400">({ride.cancellation_reason})</span>}
      </div>

      {/* Métriques clés */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard icon={<Navigation size={18} />} tone="bg-blue-50 text-blue-600"
          label="Approche (chauffeur → client)" value={ride.approach_km != null ? `${ride.approach_km} km` : '—'} />
        <MetricCard icon={<MapPin size={18} />} tone="bg-emerald-50 text-emerald-600"
          label="Distance course (→ destination)" value={ride.ride_km != null ? `${ride.ride_km} km` : '—'} />
        <MetricCard icon={<Clock size={18} />} tone="bg-amber-50 text-amber-600"
          label="Temps effectué" value={ride.duration_min != null ? `${ride.duration_min} min` : '—'} />
      </div>

      {/* Audit distance : estimé vs réel mesuré (odomètre GPS) + cohérence vitesse */}
      {(bd.estimated_distance_m != null || bd.tracked_distance_m != null) && (() => {
        const estKm = bd.estimated_distance_m != null ? Number(bd.estimated_distance_m) / 1000 : null;
        const trkKm = bd.tracked_distance_m != null ? Number(bd.tracked_distance_m) / 1000 : null;
        const billedKm = ride.ride_km;
        const source = (bd as Record<string, unknown>).distance_source as string | undefined;
        const avgSpeed = billedKm != null && ride.duration_min ? billedKm / (ride.duration_min / 60) : null;
        const implausible = avgSpeed != null && avgSpeed > 90;
        return (
          <div className={`mb-6 rounded-2xl border p-4 shadow-sm ${implausible ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Audit distance</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${source === 'tracked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {source === 'tracked' ? 'GPS réel mesuré' : 'estimation (pas de trace GPS)'}
                </span>
              </div>
              <div className="flex items-center gap-5 text-sm flex-wrap">
                <span className="text-gray-500">Estimé : <b className="text-gray-800 tabular-nums">{estKm != null ? estKm.toFixed(2) : '—'} km</b></span>
                <span className="text-gray-500">Réel mesuré : <b className="text-gray-800 tabular-nums">{trkKm != null ? trkKm.toFixed(2) : '—'} km</b></span>
                <span className="text-gray-500">Facturé : <b className="text-gray-900 tabular-nums">{billedKm != null ? billedKm : '—'} km</b></span>
                {avgSpeed != null && (
                  <span className={implausible ? 'text-red-600 font-semibold' : 'text-gray-500'}>Vitesse moy. : <b className="tabular-nums">{Math.round(avgSpeed)} km/h</b></span>
                )}
              </div>
            </div>
            {implausible && <p className="text-xs text-red-600 mt-2">⚠️ Vitesse moyenne implausible (&gt; 90 km/h) — distance probablement sur-estimée (pas de trace GPS réelle).</p>}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trajet + acteurs */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Trajet</h2>
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="flex-1 w-px bg-gray-200 my-1" />
                <span className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 space-y-6">
                <div><p className="text-xs text-gray-400">Départ</p><p className="text-sm font-medium text-gray-900">{ride.pickup_address || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Destination</p><p className="text-sm font-medium text-gray-900">{ride.dropoff_address || '—'}</p></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><User size={18} /></div>
              <div><p className="text-xs text-gray-400">Passager</p><p className="text-sm font-semibold text-gray-900">{ride.passenger_name || '—'}</p><p className="text-xs text-gray-500">{ride.passenger_phone || ''}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><Car size={18} /></div>
              <div><p className="text-xs text-gray-400">Chauffeur {ride.vehicle_type ? `· ${ride.vehicle_type}` : ''}</p><p className="text-sm font-semibold text-gray-900">{ride.driver_name || 'Non assigné'}</p><p className="text-xs text-gray-500">{ride.driver_phone || ''}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50 text-gray-600"><CreditCard size={18} /></div>
              <div><p className="text-xs text-gray-400">Paiement {ride.payment_status ? `· ${ride.payment_status}` : ''}</p><p className="text-sm font-semibold text-gray-900">{PAYMENT_LABELS[ride.payment_method ?? ''] ?? ride.payment_method ?? '—'}</p></div>
            </div>
          </div>
        </div>

        {/* Facture + chronologie */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Détail de la facture</h2>
            {bd.base_fare != null && <FareLine label="Prise en charge" value={Number(bd.base_fare)} />}
            {bd.trajectory_fare != null && bd.base_fare != null && (
              <FareLine label="Coût de la distance" value={Math.max(0, Number(bd.trajectory_fare) - Number(bd.base_fare))} />
            )}
            {bd.time_fare != null && Number(bd.time_fare) > 0 && (
              <FareLine label="Coût par minute" value={Number(bd.time_fare)} sub={bd.per_min_rate ? `${bd.per_min_rate} F/min · ${bd.ride_minutes ?? 0} min` : undefined} />
            )}
            {(Number(bd.stop_fare ?? 0) + Number(bd.pickup_waiting_fare ?? 0)) > 0 && (
              <FareLine label="Attente & arrêts" value={Number(bd.stop_fare ?? 0) + Number(bd.pickup_waiting_fare ?? 0)} />
            )}
            {Number(bd.luggage_fare ?? 0) > 0 && <FareLine label="Bagages" value={Number(bd.luggage_fare)} />}
            {ride.discount_amount > 0 && <FareLine label="Réduction" value={-ride.discount_amount} />}
            <FareLine label="Montant de la course" value={ride.fare} bold />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Chronologie</h2>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className={`text-sm ${t.at ? 'text-gray-700' : 'text-gray-300'}`}>{t.label}</span>
                  <span className={`text-xs tabular-nums ${t.at ? 'text-gray-500' : 'text-gray-300'}`}>{fmt(t.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
