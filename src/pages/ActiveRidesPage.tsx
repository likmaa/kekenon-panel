import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '@/api/client';
import { Car, MapPin, Navigation, Clock, XCircle, RefreshCw, User, Phone, PlusCircle, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getPusher } from '@/api/pusher';
import { toast } from 'react-hot-toast';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';
import type { FeatureCollection } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAPBOX_STYLE, PORTO_NOVO } from '@/config/mapbox';
import { useNavigate } from 'react-router-dom';

interface Ride {
    id: number;
    status: 'requested' | 'accepted' | 'arrived' | 'pickup' | 'ongoing' | 'completed' | 'cancelled';
    fare: number;
    fare_amount?: number;
    pickup_address: string;
    pickup_lat?: number;
    pickup_lng?: number;
    dropoff_address: string;
    dropoff_lat?: number;
    dropoff_lng?: number;
    created_at: string;
    driver?: {
        id: number;
        name: string;
        phone: string;
    } | null;
    passenger?: {
        id: number;
        name: string;
        phone: string;
    } | null;
    passenger_name?: string | null;
    passenger_phone?: string | null;
    vehicle_type?: 'standard' | 'vip';
    has_baggage?: boolean;
}

export default function ActiveRidesPage() {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [completingId, setCompletingId] = useState<number | null>(null);
    const navigate = useNavigate();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
    const [onlineDrivers, setOnlineDrivers] = useState<any[]>([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'approaching' | 'ongoing'>('all');
    const [courseStats, setCourseStats] = useState<{
        completed_count: number;
        avg_duration_seconds: number | null;
        avg_distance_m: number | null;
        avg_fare_amount: number | null;
        cancellation_rate_pct: number | null;
    } | null>(null);

    const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
    const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
    const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const mapRef = useRef<MapRef | null>(null);

    const selectedRide = rides.find(r => r.id === selectedRideId);

    // Itinéraire en GeoJSON (LineString [lng,lat]) — réel (OSRM) ou fallback pickup→dropoff
    const routeGeoJSON = useMemo<FeatureCollection>(() => {
        let coords: [number, number][] = [];
        if (routeCoords.length > 0) {
            coords = routeCoords.map(([lat, lng]) => [lng, lat]);
        } else if (selectedRide?.pickup_lat && selectedRide?.pickup_lng && selectedRide?.dropoff_lat && selectedRide?.dropoff_lng) {
            coords = [
                [selectedRide.pickup_lng, selectedRide.pickup_lat],
                [selectedRide.dropoff_lng, selectedRide.dropoff_lat],
            ];
        }
        return {
            type: 'FeatureCollection',
            features: coords.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [],
        };
    }, [routeCoords, selectedRide]);

    // Recentre la carte sur le chauffeur (ou le point de départ) — remplace l'ancien MapUpdater
    useEffect(() => {
        const c = driverLocation
            ?? (selectedRide?.pickup_lat && selectedRide?.pickup_lng ? { lat: selectedRide.pickup_lat, lng: selectedRide.pickup_lng } : null);
        if (c && mapRef.current) {
            mapRef.current.flyTo({ center: [c.lng, c.lat], duration: 1200 });
            // Force le redimensionnement pour éviter le bug de la "demi-carte"
            setTimeout(() => {
                mapRef.current?.getMap().resize();
            }, 300);
        }
    }, [driverLocation, selectedRideId]);

    // Fetch real road route between driver and pickup/dropoff
    const fetchRoute = async (start: [number, number], end: [number, number]) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                setRouteCoords(coords);
                setRouteInfo({
                    distance: data.routes[0].distance,
                    duration: data.routes[0].duration
                });
            }
        } catch (e) {
            console.error("Routing error", e);
        }
    };

    // Poll driver location and update route
    useEffect(() => {
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        setDriverLocation(null);
        setRouteCoords([]);

        if (selectedRideId && selectedRide?.driver && ['accepted', 'arrived', 'pickup', 'ongoing'].includes(selectedRide.status)) {
            const fetchLoc = async () => {
                try {
                    const res = await api.get(`/api/admin/drivers/${selectedRide.driver?.id}/location`);
                    if (res.data.last_lat && res.data.last_lng) {
                        const newLoc = { lat: res.data.last_lat, lng: res.data.last_lng };
                        setDriverLocation(newLoc);

                        // If approaching client, show route to pickup
                        if (['accepted', 'arrived'].includes(selectedRide.status) && selectedRide.pickup_lat) {
                            fetchRoute([newLoc.lat, newLoc.lng], [selectedRide.pickup_lat, selectedRide.pickup_lng!]);
                        }
                        // If trip started, show route to destination
                        else if (['pickup', 'ongoing'].includes(selectedRide.status) && selectedRide.dropoff_lat) {
                            fetchRoute([newLoc.lat, newLoc.lng], [selectedRide.dropoff_lat, selectedRide.dropoff_lng!]);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching driver location", e);
                }
            };
            fetchLoc();
            locationIntervalRef.current = setInterval(fetchLoc, 10000);
        }

        return () => {
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
        };
    }, [selectedRideId, selectedRide?.driver?.id, selectedRide?.status]);

    const [newRideData, setNewRideData] = useState({
        passenger_name: '',
        passenger_phone: '',
        pickup_address: '',
        dropoff_address: '',
        fare_amount: '',
        vehicle_type: 'standard',
        has_baggage: false,
    });

    const fetchRides = async () => {
        try {
            setLoading(true);
            const t = Date.now();
            const [requested, accepted, arrived, pickup, ongoing] = await Promise.all([
                api.get(`/api/admin/rides?status=requested&t=${t}`),
                api.get(`/api/admin/rides?status=accepted&t=${t}`),
                api.get(`/api/admin/rides?status=arrived&t=${t}`),
                api.get(`/api/admin/rides?status=pickup&t=${t}`),
                api.get(`/api/admin/rides?status=ongoing&t=${t}`),
            ]);

            const combined = [
                ...(requested.data.data || []),
                ...(accepted.data.data || []),
                ...(arrived.data.data || []),
                ...(pickup.data.data || []),
                ...(ongoing.data.data || []),
            ];

            const seen = new Set();
            const allActive = combined.filter(ride => {
                if (seen.has(ride.id)) return false;
                seen.add(ride.id);
                return true;
            }).sort((a, b) => b.id - a.id);

            setRides(allActive);
        } catch (error) {
            console.error('Error fetching active rides:', error);
            toast.error('Erreur lors de la récupération des courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseStats = async () => {
        try {
            const res = await api.get('/api/admin/stats/dispatch');
            setCourseStats(res.data?.courses ?? null);
        } catch {
            // KPI non bloquants
        }
    };

    useEffect(() => {
        fetchRides();
        fetchCourseStats();
        // Fallback polling si Pusher rate un event
        const interval = setInterval(() => { fetchRides(); fetchCourseStats(); }, 30000);

        const pusher = getPusher();
        const channel = pusher.subscribe('private-admin.alerts');

        channel.bind('ride.cancelled', (data: { rideId: number }) => {
            setRides(prev => prev.filter(r => r.id !== data.rideId));
            toast('Course annulée', { icon: '⚠️' });
        });
        
        channel.bind('ride.created', () => {
            fetchRides();
            toast.success('Nouvelle course demandée !');
        });
        
        channel.bind('ride.status_updated', () => {
            fetchRides();
        });

        return () => {
            clearInterval(interval);
            channel.unbind_all();
            pusher.unsubscribe('private-admin.alerts');
        };
    }, []);

    const handleCancel = async (rideId: number) => {
        if (!window.confirm('Êtes-vous sûr de vouloir annuler cette course ?')) return;

        try {
            setCancellingId(rideId);
            await api.post(`/api/admin/rides/${rideId}/cancel`);
            setRides(prev => prev.filter(r => r.id !== rideId));
            toast.success('Course annulée');
        } catch (error) {
            toast.error('Erreur lors de l\'annulation');
        } finally {
            setCancellingId(null);
        }
    };

    const handleComplete = async (rideId: number) => {
        if (!window.confirm('Valider et terminer cette course ? Le tarif et la commission seront calculés normalement. À utiliser si l\'app du chauffeur a planté.')) return;

        try {
            setCompletingId(rideId);
            const res = await api.post(`/api/admin/rides/${rideId}/complete`);
            setRides(prev => prev.filter(r => r.id !== rideId));
            const fare = res?.data?.fare;
            toast.success(fare != null ? `Course validée — ${Number(fare).toLocaleString('fr-FR')} F` : 'Course validée');
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Erreur lors de la validation de la course';
            toast.error(msg);
        } finally {
            setCompletingId(null);
        }
    };

    const fetchOnlineDrivers = async () => {
        try {
            setLoadingDrivers(true);
            const res = await api.get('/api/admin/drivers/online?online=1');
            setOnlineDrivers(res.data.data || res.data || []);
        } catch (error) {
            toast.error('Erreur lors du chargement des chauffeurs');
        } finally {
            setLoadingDrivers(false);
        }
    };

    const handleAssignDriver = async (driverId: number) => {
        if (!selectedRideId) return;
        try {
            await api.post(`/api/admin/rides/${selectedRideId}/assign`, { driver_id: driverId });
            toast.success('Chauffeur assigné');
            setIsAssignModalOpen(false);
            fetchRides();
        } catch (error) {
            toast.error('Erreur lors de l\'assignation');
        }
    };

    const getTimeElapsed = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
        if (diff < 1) return "À l'instant";
        if (diff < 60) return `depuis ${diff} min`;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `depuis ${hours}h ${mins}m`;
    };

    const getStatusConfig = (status: Ride['status'], createdAt: string) => {
        const elapsed = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
        
        switch (status) {
            case 'requested':
                return {
                    label: 'En attente',
                    group: 'waiting',
                    color: elapsed > 10 ? 'text-red-700 bg-red-100 border-red-200' : 'text-orange-700 bg-orange-100 border-orange-200',
                    dot: elapsed > 10 ? 'bg-red-500' : 'bg-orange-500',
                    isAlert: elapsed > 10
                };
            case 'accepted':
            case 'arrived':
                return {
                    label: status === 'arrived' ? 'Chauffeur sur place' : 'Chauffeur en approche',
                    group: 'approaching',
                    color: 'text-blue-700 bg-blue-100 border-blue-200',
                    dot: 'bg-blue-500',
                    isAlert: false
                };
            case 'pickup':
            case 'ongoing':
                return {
                    label: 'Course démarrée (En route)',
                    group: 'ongoing',
                    color: 'text-green-700 bg-green-100 border-green-200',
                    dot: 'bg-green-500',
                    isAlert: false
                };
            default:
                return { label: status, group: 'other', color: 'text-gray-700 bg-gray-100', dot: 'bg-gray-500', isAlert: false };
        }
    };

    const groupedRides = {
        waiting: rides.filter(r => getStatusConfig(r.status, r.created_at).group === 'waiting'),
        approaching: rides.filter(r => getStatusConfig(r.status, r.created_at).group === 'approaching'),
        ongoing: rides.filter(r => getStatusConfig(r.status, r.created_at).group === 'ongoing'),
    };

    const getFilteredRides = () => {
        if (activeTab === 'all') return rides;
        return groupedRides[activeTab] || [];
    };

    const filteredRides = getFilteredRides();

    return (
        <div className="h-full flex flex-col font-sans -m-6 p-6 bg-gray-50/50">
            {/* Header Operations */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Opérations Live
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Supervision temps réel du terrain VTC</p>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={fetchRides}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => navigate('/rides/create')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark shadow-sm transition-all"
                    >
                        <PlusCircle size={16} />
                        Créer une course
                    </button>
                </div>
            </div>

            {/* KPI Module Courses (§20.4) — aujourd'hui */}
            {courseStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {[
                        { label: 'Terminées (jour)', value: courseStats.completed_count },
                        { label: 'Durée moyenne', value: courseStats.avg_duration_seconds != null ? `${Math.round(courseStats.avg_duration_seconds / 60)} min` : '—' },
                        { label: 'Distance moyenne', value: courseStats.avg_distance_m != null ? `${(courseStats.avg_distance_m / 1000).toFixed(1)} km` : '—' },
                        { label: 'Montant moyen', value: courseStats.avg_fare_amount != null ? `${courseStats.avg_fare_amount.toLocaleString('fr-FR')} F` : '—' },
                        { label: "Taux d'annulation", value: courseStats.cancellation_rate_pct != null ? `${courseStats.cancellation_rate_pct}%` : '—', alert: (courseStats.cancellation_rate_pct ?? 0) >= 30 },
                    ].map((k, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                            <p className={`text-xl font-bold ${k.alert ? 'text-red-600' : 'text-gray-900'}`}>{k.value}</p>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">{k.label}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                
                {/* Colonne de Gauche : Timeline des courses */}
                <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
                    {/* Filtres internes */}
                    <div className="p-3 border-b border-gray-100 flex gap-2 overflow-x-auto shrink-0 bg-gray-50/50">
                        {[
                            { id: 'all', label: 'Toutes', count: rides.length },
                            { id: 'waiting', label: 'En attente', count: groupedRides.waiting.length },
                            { id: 'approaching', label: 'En approche', count: groupedRides.approaching.length },
                            { id: 'ongoing', label: 'En cours', count: groupedRides.ongoing.length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === tab.id 
                                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                    : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                                }`}
                            >
                                {tab.label} <span className="ml-1 opacity-60">({tab.count})</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading && rides.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 text-sm">Chargement du flux...</div>
                        ) : filteredRides.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center opacity-60">
                                <ShieldAlert size={32} className="text-gray-400 mb-2" />
                                <p className="text-sm font-medium">Aucune course dans ce statut</p>
                            </div>
                        ) : (
                            filteredRides.map(ride => {
                                const config = getStatusConfig(ride.status, ride.created_at);
                                const timeElapsed = getTimeElapsed(ride.created_at);
                                
                                return (
                                    <div 
                                        key={ride.id} 
                                        onClick={() => setSelectedRideId(ride.id)} // Active state on click
                                        className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                                            selectedRideId === ride.id ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5' : 'border-gray-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-black text-gray-900 text-lg">#{ride.id}</span>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                </div>
                                                <p className={`text-xs font-semibold flex items-center gap-1 ${config.isAlert ? 'text-red-600' : 'text-gray-500'}`}>
                                                    <Clock size={12} /> {timeElapsed}
                                                    {config.isAlert && <AlertTriangle size={12} className="ml-1" />}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">{((ride.fare_amount ?? ride.fare) ?? 0).toLocaleString('fr-FR')} F</div>
                                                <div className="text-[10px] text-gray-500 font-medium uppercase mt-0.5">{ride.vehicle_type === 'vip' ? 'VIP' : 'Standard'}</div>
                                            </div>
                                        </div>

                                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-3 mb-4 mt-2">
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Départ</p>
                                                <p className="text-sm font-medium text-gray-800 line-clamp-1">{ride.pickup_address}</p>
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white"></div>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Arrivée</p>
                                                <p className="text-sm font-medium text-gray-800 line-clamp-1">{ride.dropoff_address}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Passager</p>
                                                <p className="text-xs font-bold text-gray-900 truncate">{ride.passenger_name || ride.passenger?.name || 'Inconnu'}</p>
                                            </div>
                                            <div className="w-px h-6 bg-gray-200"></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Chauffeur</p>
                                                <p className={`text-xs font-bold truncate ${ride.driver ? 'text-gray-900' : 'text-orange-500'}`}>
                                                    {ride.driver?.name || 'Recherche...'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions rapides */}
                                        {selectedRideId === ride.id && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                                                {['requested', 'accepted', 'arrived'].includes(ride.status) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); fetchOnlineDrivers(); setIsAssignModalOpen(true); }}
                                                        className="flex-1 py-1.5 bg-primary text-white rounded text-xs font-bold hover:bg-primary-dark transition-colors"
                                                    >
                                                        {ride.status === 'requested' ? 'Assigner' : 'Réassigner'}
                                                    </button>
                                                )}
                                                {(ride.status === 'pickup' || ride.status === 'ongoing') && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleComplete(ride.id); }}
                                                        disabled={completingId === ride.id}
                                                        title="Valider la course (récupération après crash de l'app chauffeur)"
                                                        className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
                                                    >
                                                        {completingId === ride.id ? '...' : (<><CheckCircle2 size={13} /> Valider</>)}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCancel(ride.id); }}
                                                    disabled={cancellingId === ride.id}
                                                    className="flex-1 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                                                >
                                                    {cancellingId === ride.id ? '...' : 'Annuler'}
                                                </button>
                                                {ride.driver && (
                                                    <button className="flex-1 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-bold hover:bg-gray-200 transition-colors">
                                                        Appeler
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Colonne de Droite : Live Map (Supervision tactique) */}
                <div className="lg:col-span-2 bg-gray-100 rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full relative flex flex-col">
                    {!selectedRide ? (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/50 backdrop-blur-[2px]">
                            <div className="text-center p-8 bg-white/90 rounded-2xl shadow-xl border border-gray-100 max-w-xs">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500 mx-auto">
                                    <Navigation size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Prêt pour le suivi</h3>
                                <p className="text-sm text-gray-500">Sélectionnez une course à gauche pour visualiser le trajet et la position du chauffeur en temps réel.</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="flex-1 relative min-h-0 bg-gray-200">
                        <Map
                            ref={mapRef}
                            mapboxAccessToken={MAPBOX_TOKEN}
                            mapStyle={MAPBOX_STYLE}
                            initialViewState={{ longitude: PORTO_NOVO.lng, latitude: PORTO_NOVO.lat, zoom: 14 }}
                            style={{ height: '100%', width: '100%' }}
                            onLoad={(e) => {
                                e.target.resize();
                                // Petit délai supplémentaire pour être sûr que le layout est stable
                                setTimeout(() => e.target.resize(), 500);
                            }}
                        >
                            <NavigationControl position="top-left" />

                            {selectedRide && (
                                <>
                                    {/* Itinéraire (réel OSRM ou fallback pickup→dropoff) */}
                                    <Source id="ride-route" type="geojson" data={routeGeoJSON}>
                                        <Layer
                                            id="ride-route-line"
                                            type="line"
                                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                                            paint={routeCoords.length > 0
                                                ? { 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.85 }
                                                : { 'line-color': '#3650D0', 'line-width': 4, 'line-dasharray': [2, 2] }}
                                        />
                                    </Source>

                                    {selectedRide.pickup_lat && selectedRide.pickup_lng && (
                                        <Marker longitude={selectedRide.pickup_lng} latitude={selectedRide.pickup_lat} anchor="center">
                                            <div title={`Départ : ${selectedRide.pickup_address}`} className="flex flex-col items-center">
                                                <div className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded shadow-sm mb-1 uppercase">Départ</div>
                                                <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow" />
                                            </div>
                                        </Marker>
                                    )}
                                    {selectedRide.dropoff_lat && selectedRide.dropoff_lng && (
                                        <Marker longitude={selectedRide.dropoff_lng} latitude={selectedRide.dropoff_lat} anchor="center">
                                            <div title={`Arrivée : ${selectedRide.dropoff_address}`} className="flex flex-col items-center">
                                                <div className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded shadow-sm mb-1 uppercase">Arrivée</div>
                                                <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
                                            </div>
                                        </Marker>
                                    )}

                                    {/* Position réelle du chauffeur */}
                                    {driverLocation && (
                                        <Marker longitude={driverLocation.lng} latitude={driverLocation.lat} anchor="center">
                                            <div className="relative group cursor-pointer" title={selectedRide.driver?.name ?? 'Chauffeur'}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                                    {selectedRide.driver?.name}
                                                </div>
                                                <div className="text-3xl filter drop-shadow-md transform -scale-x-100">🚗</div>
                                            </div>
                                        </Marker>
                                    )}
                                </>
                            )}
                        </Map>
                    </div>

                    {/* Overlay d'infos live enrichi */}
                    {selectedRide && (
                        <div className="absolute bottom-6 left-6 right-6 z-[400]">
                            <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-blue-100 flex flex-wrap items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                                        <Car size={28} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tracking Live</p>
                                            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                        </div>
                                        <p className="text-base font-bold text-gray-900">{selectedRide.driver?.name || 'Chauffeur en attente'}</p>
                                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                            <Phone size={12} /> {selectedRide.driver?.phone || '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 flex items-center justify-around gap-6 border-l border-gray-100 pl-6">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Passager</p>
                                        <p className="text-xs font-black text-gray-900 line-clamp-1">{selectedRide.passenger_name || selectedRide.passenger?.name || 'Client'}</p>
                                        <p className="text-[10px] text-gray-500 font-bold">{selectedRide.passenger_phone || selectedRide.passenger?.phone || ''}</p>
                                    </div>

                                    {routeInfo && (
                                        <>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Distance</p>
                                                <p className="text-sm font-black text-blue-700">{(routeInfo.distance / 1000).toFixed(1)} km</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Arrivée estimée</p>
                                                <p className="text-sm font-black text-blue-700">{Math.ceil(routeInfo.duration / 60)} min</p>
                                            </div>
                                        </>
                                    )}

                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <span className="text-xs font-black text-gray-900">{getStatusConfig(selectedRide.status, selectedRide.created_at).label}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (mapRef.current && driverLocation) {
                                            mapRef.current.flyTo({ center: [driverLocation.lng, driverLocation.lat], zoom: 16, duration: 1500 });
                                        }
                                    }}
                                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 transition-all shadow-sm"
                                    title="Recentrer sur le chauffeur"
                                >
                                    <Navigation size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Modals : IsAssignModalOpen et IsNewRideModalOpen (Gardés depuis l'ancienne version, mais à refactorer si besoin) */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Assigner un chauffeur</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                            {loadingDrivers ? (
                                <div className="p-8 text-center text-gray-500">Chargement des chauffeurs en ligne...</div>
                            ) : onlineDrivers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">Aucun chauffeur en ligne pour le moment.</div>
                            ) : (
                                <div className="space-y-3">
                                    {onlineDrivers.filter(d => d.is_online).map(driver => (
                                        <div key={driver.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between hover:border-primary transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 p-2 rounded-full text-green-600">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{driver.name}</p>
                                                    <p className="text-xs text-gray-500">{driver.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAssignDriver(driver.id)}
                                                className="px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg text-xs font-bold transition-colors shadow-sm"
                                            >
                                                Sélectionner
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
