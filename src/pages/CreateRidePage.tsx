import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAPBOX_STYLE, PORTO_NOVO } from '@/config/mapbox';
import { api } from '@/api/client';
import { ArrowLeft, MapPin, Navigation, Loader2, Car, Clock, Route as RouteIcon, Crosshair, CheckCircle, Search } from 'lucide-react';

type Pt = { lng: number; lat: number; address: string };
type Estimate = { price: number; distance_m: number; eta_s: number; geometry: any | null };
type SearchItem = { place_id?: string; display_name: string; lat: string | number; lon: string | number };

/** Champ adresse avec autocomplétion (recherche /geocoding/search, façon Google Maps). */
function AddressField({
  label, dotClass, point, onPick, proximity, autoFocus,
}: {
  label: string;
  dotClass: string;
  point: Pt | null;
  onPick: (pt: Pt) => void;
  proximity: { lat: number; lng: number };
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(point?.address ?? '');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setText(point?.address ?? ''); }, [point?.address]);

  const runSearch = (q: string) => {
    setText(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/api/geocoding/search', {
          params: { query: q.trim(), language: 'fr', limit: 6, lat: proximity.lat, lon: proximity.lng },
        });
        const raw = res.data?.results ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
        const items = (raw as SearchItem[]).filter((it) => it.lat && it.lon && it.display_name);
        setResults(items.slice(0, 6));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const pick = (it: SearchItem) => {
    onPick({ lat: Number(it.lat), lng: Number(it.lon), address: it.display_name });
    setText(it.display_name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative">
      <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} /> {label}
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Tape une adresse ou clique sur la carte…"
          className="w-full border rounded-lg pl-8 pr-8 py-2 text-sm"
        />
        {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {results.map((it, i) => (
            <li
              key={it.place_id ?? `${it.lat}-${it.lon}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-primary/5 cursor-pointer flex items-start gap-2"
            >
              <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{it.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Page d'estimation + création de course (départ/arrivée par recherche d'adresse ou clic carte).
 * Estimation via /routing/estimate (= prix passager) ; création via POST /admin/rides.
 */
export default function CreateRidePage() {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const [active, setActive] = useState<'pickup' | 'dropoff'>('pickup');
  const [pickup, setPickup] = useState<Pt | null>(null);
  const [dropoff, setDropoff] = useState<Pt | null>(null);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'standard' | 'vip'>('standard');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flyTo = (lng: number, lat: number) => {
    try { mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 600 }); } catch { /* noop */ }
  };

  const setPoint = (which: 'pickup' | 'dropoff', pt: Pt) => {
    setEstimate(null);
    if (which === 'pickup') { setPickup(pt); setActive('dropoff'); } else { setDropoff(pt); }
    flyTo(pt.lng, pt.lat);
  };

  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      const res = await api.get('/api/geocoding/reverse', { params: { lat, lon: lng, language: 'fr' } });
      return res.data?.address || res.data?.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const handleMapClick = useCallback(async (e: { lngLat: { lng: number; lat: number } }) => {
    const { lng, lat } = e.lngLat;
    setEstimate(null);
    const provisional = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (active === 'pickup') {
      setPickup({ lng, lat, address: provisional });
      setActive('dropoff');
      const address = await reverseGeocode(lng, lat);
      setPickup((p) => (p && p.lng === lng && p.lat === lat ? { ...p, address } : p));
    } else {
      setDropoff({ lng, lat, address: provisional });
      const address = await reverseGeocode(lng, lat);
      setDropoff((d) => (d && d.lng === lng && d.lat === lat ? { ...d, address } : d));
    }
  }, [active]);

  const handleEstimate = async () => {
    if (!pickup || !dropoff) return;
    setEstimating(true); setError(null); setEstimate(null);
    try {
      const res = await api.post('/api/routing/estimate', {
        pickup: { lat: pickup.lat, lng: pickup.lng },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng },
        vehicle_type: vehicleType,
      });
      setEstimate({
        price: Number(res.data.price ?? 0),
        distance_m: Number(res.data.distance_m ?? 0),
        eta_s: Number(res.data.eta_s ?? 0),
        geometry: res.data.geometry ?? null,
      });
      try {
        mapRef.current?.fitBounds(
          [[Math.min(pickup.lng, dropoff.lng), Math.min(pickup.lat, dropoff.lat)],
           [Math.max(pickup.lng, dropoff.lng), Math.max(pickup.lat, dropoff.lat)]],
          { padding: 80, duration: 600 }
        );
      } catch { /* noop */ }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'estimation. Vérifiez les points.");
    } finally {
      setEstimating(false);
    }
  };

  const handleCreate = async () => {
    if (!pickup || !dropoff || !estimate) return;
    setCreating(true); setError(null);
    try {
      await api.post('/api/admin/rides', {
        pickup_address: pickup.address,
        dropoff_address: dropoff.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        fare_amount: estimate.price,
        passenger_name: passengerName || null,
        passenger_phone: passengerPhone || null,
        vehicle_type: vehicleType,
      });
      setCreated(true);
      setTimeout(() => navigate('/rides/active'), 800);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de la création de la course.");
    } finally {
      setCreating(false);
    }
  };

  const reset = () => { setPickup(null); setDropoff(null); setEstimate(null); setActive('pickup'); setError(null); };

  const routeFeature = estimate?.geometry ? { type: 'Feature' as const, properties: {}, geometry: estimate.geometry } : null;
  const km = estimate ? (estimate.distance_m / 1000).toFixed(2) : null;
  const min = estimate ? Math.round(estimate.eta_s / 60) : null;
  const proximity = pickup ?? PORTO_NOVO;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={22} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Créer / estimer une course</h1>
          <p className="text-sm text-gray-500">Tape une adresse ou clique sur la carte pour définir départ et arrivée.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 160px)', minHeight: 460 }}>
        {/* Form */}
        <div className="lg:w-[380px] shrink-0 overflow-y-auto p-5 space-y-4 border-r border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActive('pickup')} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition ${active === 'pickup' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <Crosshair size={15} /> Clic = Départ
            </button>
            <button onClick={() => setActive('dropoff')} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition ${active === 'dropoff' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <Crosshair size={15} /> Clic = Arrivée
            </button>
          </div>

          <AddressField label="Départ" dotClass="bg-emerald-500" point={pickup} proximity={proximity} autoFocus onPick={(pt) => setPoint('pickup', pt)} />
          <AddressField label="Arrivée" dotClass="bg-red-500" point={dropoff} proximity={proximity} onPick={(pt) => setPoint('dropoff', pt)} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de véhicule</label>
            <div className="grid grid-cols-2 gap-2">
              {(['standard', 'vip'] as const).map((vt) => (
                <button key={vt} onClick={() => { setVehicleType(vt); setEstimate(null); }} className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border transition ${vehicleType === vt ? 'bg-primary/10 border-primary/40 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <Car size={15} /> {vt === 'vip' ? 'VIP' : 'Standard'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom passager</label>
              <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder="Optionnel" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} placeholder="Optionnel" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <button onClick={handleEstimate} disabled={!pickup || !dropoff || estimating} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-marine rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
            {estimating ? <Loader2 size={16} className="animate-spin" /> : <RouteIcon size={16} />} Estimer le prix
          </button>

          {estimate && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-500">Prix estimé</span>
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{estimate.price.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5"><Navigation size={14} /> Distance</span><span className="tabular-nums">{km} km</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Durée estimée</span><span className="tabular-nums">{min} min</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={reset} className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800">Réinitialiser</button>
            <button onClick={handleCreate} disabled={!estimate || creating || created} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              {created ? <><CheckCircle size={16} /> Course créée</> : creating ? <Loader2 size={16} className="animate-spin" /> : 'Créer la course'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">La création envoie la demande aux chauffeurs proches (statut « en attente »).</p>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[300px] relative">
          <Map ref={mapRef} mapboxAccessToken={MAPBOX_TOKEN} mapStyle={MAPBOX_STYLE} initialViewState={{ longitude: PORTO_NOVO.lng, latitude: PORTO_NOVO.lat, zoom: 12 }} onClick={handleMapClick} cursor="crosshair" style={{ width: '100%', height: '100%' }}>
            <NavigationControl position="top-right" />
            {pickup && <Marker longitude={pickup.lng} latitude={pickup.lat} anchor="bottom"><MapPin size={30} className="text-emerald-600 fill-emerald-200" /></Marker>}
            {dropoff && <Marker longitude={dropoff.lng} latitude={dropoff.lat} anchor="bottom"><MapPin size={30} className="text-red-600 fill-red-200" /></Marker>}
            {routeFeature && (
              <Source id="route" type="geojson" data={routeFeature as any}>
                <Layer id="route-line" type="line" paint={{ 'line-color': '#4f46e5', 'line-width': 4, 'line-opacity': 0.85 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
              </Source>
            )}
          </Map>
          <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-gray-600 shadow">
            Prochain clic carte : <span className="font-semibold">{active === 'pickup' ? 'départ' : 'arrivée'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
