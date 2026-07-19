import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl';
import type { FeatureCollection } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAPBOX_STYLE, PORTO_NOVO, circleRing } from '@/config/mapbox';
import { api } from '@/api/client';
import { Car, UserCheck, Clock, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';

interface MapDriver { id: number; name: string; lat: number; lng: number; status: 'available' | 'busy'; }
interface PendingRequest { id: number; lat: number; lng: number; address: string | null; waiting_minutes: number; }
interface Zone { lat: number; lng: number; demand: number; available_drivers: number; high_demand: boolean; underserved: boolean; }
interface MapData {
  center: { lat: number; lng: number };
  summary: { available_drivers: number; busy_drivers: number; pending_requests: number; avg_wait_seconds: number | null };
  drivers: MapDriver[];
  pending_requests: PendingRequest[];
  zones: Zone[];
}

const fmtWait = (sec: number | null) => {
  if (sec === null) return '—';
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)} min`;
};

const KpiPill: React.FC<{ icon: React.ElementType; label: string; value: string | number; tone: string }> = ({ icon: Icon, label, value, tone }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}><Icon size={20} /></div>
    <div>
      <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

type SelectedPopup =
  | { kind: 'driver'; data: MapDriver }
  | { kind: 'request'; data: PendingRequest };

export default function StrategicMapPage() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<SelectedPopup | null>(null);

  const fetchMap = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/stats/map');
      setData(res.data);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger la carte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap();
    const interval = setInterval(fetchMap, 20000);
    return () => clearInterval(interval);
  }, [fetchMap]);

  // Zones → GeoJSON (cercles ~600m)
  const zonesGeoJSON = useMemo<FeatureCollection>(() => {
    const feats = (data?.zones ?? [])
      .filter((z) => z.high_demand || z.underserved)
      .map((z) => ({
        type: 'Feature' as const,
        properties: { underserved: z.underserved },
        geometry: { type: 'Polygon' as const, coordinates: [circleRing(z.lng, z.lat, 600)] },
      }));
    return { type: 'FeatureCollection', features: feats };
  }, [data?.zones]);

  const zonesToWatch = (data?.zones ?? []).filter((z) => z.high_demand || z.underserved);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MapPin size={22} className="text-primary" /> Carte stratégique — Porto-Novo
          </h1>
          <p className="text-sm text-gray-500 mt-1">Répartition de la flotte et de la demande en temps réel.</p>
        </div>
        <button onClick={fetchMap} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} /><p>{error}</p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiPill icon={UserCheck} label="Zems disponibles" value={data.summary.available_drivers} tone="bg-green-50 text-green-600" />
          <KpiPill icon={Car} label="Zems occupés" value={data.summary.busy_drivers} tone="bg-amber-50 text-amber-600" />
          <KpiPill icon={MapPin} label="Demandes en attente" value={data.summary.pending_requests} tone="bg-red-50 text-red-600" />
          <KpiPill icon={Clock} label="Temps moyen d'attente" value={fmtWait(data.summary.avg_wait_seconds)} tone="bg-orange-50 text-orange-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: '70vh', minHeight: 480 }}>
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={MAPBOX_STYLE}
            initialViewState={{ longitude: PORTO_NOVO.lng, latitude: PORTO_NOVO.lat, zoom: 12 }}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-left" />

            {/* Zones */}
            <Source id="zones" type="geojson" data={zonesGeoJSON}>
              <Layer
                id="zones-fill"
                type="fill"
                paint={{ 'fill-color': ['case', ['get', 'underserved'], '#dc2626', '#f59e0b'], 'fill-opacity': 0.12 }}
              />
              <Layer
                id="zones-line"
                type="line"
                paint={{ 'line-color': ['case', ['get', 'underserved'], '#dc2626', '#f59e0b'], 'line-width': 1.5 }}
              />
            </Source>

            {/* Zems */}
            {data?.drivers.map((d) => (
              <Marker key={`drv-${d.id}`} longitude={d.lng} latitude={d.lat} anchor="center"
                onClick={(e) => { e.originalEvent.stopPropagation(); setPopup({ kind: 'driver', data: d }); }}>
                <div style={{ cursor: 'pointer' }} className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow ${d.status === 'available' ? 'bg-green-600' : 'bg-amber-600'}`} />
              </Marker>
            ))}

            {/* Demandes en attente */}
            {data?.pending_requests.map((p) => (
              <Marker key={`req-${p.id}`} longitude={p.lng} latitude={p.lat} anchor="center"
                onClick={(e) => { e.originalEvent.stopPropagation(); setPopup({ kind: 'request', data: p }); }}>
                <div style={{ cursor: 'pointer' }} className="w-3 h-3 rounded-full border-2 border-white shadow bg-red-600" />
              </Marker>
            ))}

            {popup && (
              <Popup
                longitude={popup.kind === 'driver' ? popup.data.lng : popup.data.lng}
                latitude={popup.kind === 'driver' ? popup.data.lat : popup.data.lat}
                anchor="bottom"
                onClose={() => setPopup(null)}
                closeButton
              >
                {popup.kind === 'driver' ? (
                  <div className="text-sm">
                    <b>{popup.data.name}</b><br />
                    {popup.data.status === 'available' ? '🟢 Disponible' : '🔵 En course'}
                  </div>
                ) : (
                  <div className="text-sm">
                    <b>Course #{popup.data.id}</b><br />
                    {popup.data.address || 'Adresse inconnue'}<br />
                    En attente : {popup.data.waiting_minutes} min
                  </div>
                )}
              </Popup>
            )}
          </Map>
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Légende</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" /> Zem disponible</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-600" /> Zem en course</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Demande en attente</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400/40 border border-amber-500" /> Zone à forte demande</li>
              <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-400/30 border border-red-600 border-dashed" /> Zone sous-desservie</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Zones à surveiller</h3>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {zonesToWatch.length === 0 && <p className="text-xs text-gray-400">Aucune zone critique pour l'instant.</p>}
              {zonesToWatch.map((z, i) => (
                <div key={i} className={`p-2.5 rounded-lg border text-xs ${z.underserved ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="font-bold text-gray-800">{z.underserved ? '⚠️ Sous-desservie' : '🔥 Forte demande'}</div>
                  <div className="text-gray-600 mt-0.5">{z.demand} demande(s) · {z.available_drivers} zem(s) dispo</div>
                  <div className="text-gray-400 mt-0.5">{z.lat.toFixed(3)}, {z.lng.toFixed(3)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Carte Mapbox · mise à jour automatique toutes les 20 s · zones calculées sur les 6 dernières heures</p>
    </div>
  );
}
