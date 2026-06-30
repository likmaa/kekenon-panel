import React, { useEffect, useState } from 'react';
import { MapPin, Eye, UserCheck, FileText, XCircle, Car, Star, PowerOff, ShieldAlert, Phone } from 'lucide-react';
import { api } from '@/api/client';

type DriverStatus = 'pending' | 'approved' | 'rejected';

interface OnlineDriver {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  photo?: string | null;
  is_online: boolean;
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_at?: string | null;
  status?: string | null;
  vehicle_number?: string | null;
  license_number?: string | null;
  documents?: any;
}

interface DriverProfileDetails {
  user: {
    id: number;
    name: string;
    phone: string;
    role: string | null;
    vehicle_number: string | null;
    license_number: string | null;
    photo: string | null;
  };
  profile: null | {
    status: DriverStatus | string;
    vehicle_number: string | null;
    license_number: string | null;
    photo: string | null;
    documents: Record<string, any> | null;
    created_at: string | null;
    updated_at: string | null;
  };
}

const StatusBadge = ({ status }: { status: DriverStatus | string }) => {
  const statusStyles: Record<DriverStatus | 'default', string> = {
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    approved: 'bg-green-100 text-green-800 border border-green-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
  };
  const normalized = status?.toString?.().toLowerCase?.() ?? 'default';
  const isKnown = ['pending', 'approved', 'rejected'].includes(normalized);
  const key: keyof typeof statusStyles = isKnown ? (normalized as DriverStatus) : 'default';
  const style = statusStyles[key];
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${style}`}>
      {status.toString().charAt(0).toUpperCase() + status.toString().slice(1)}
    </span>
  );
};

const DriverProfileModal = ({ driver, onClose }: { driver: OnlineDriver | null; onClose: () => void }) => {
  const [details, setDetails] = useState<DriverProfileDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!driver) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/admin/drivers/${driver.id}/profile`);
        setDetails(res.data as DriverProfileDetails);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Erreur de chargement du dossier du chauffeur');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [driver?.id]);

  if (!driver) return null;

  const profileStatus: string = (details?.profile?.status ?? driver.status ?? '—') as string;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Dossier du Chauffeur : {driver.name}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <XCircle size={24} />
          </button>
        </header>
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading && <p className="text-sm text-gray-500">Chargement du dossier...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {details && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    {details.profile?.photo || details.user.photo ? (
                      <img
                        src={details.profile?.photo || details.user.photo || ''}
                        alt={details.user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(details.user.name)}&background=random`}
                        alt={details.user.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Informations personnelles</h4>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Nom :</span> {details.user.name}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Téléphone :</span> {details.user.phone}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Rôle actuel :</span> {details.user.role || '—'}
                  </p>
                </div>
                <div className="md:col-span-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Profil chauffeur</h4>
                  <p className="text-sm text-gray-800 flex items-center gap-2">
                    <span className="font-medium">Statut :</span> <StatusBadge status={profileStatus} />
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Immatriculation :</span>{' '}
                    {details.profile?.vehicle_number || details.user.vehicle_number || 'Non renseigné'}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Droit Taxi :</span>{' '}
                    {details.profile?.license_number || details.user.license_number || 'Non renseigné'}
                  </p>
                </div>
              </section>

              {details.profile?.documents && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FileText size={16} /> Documents transmis
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-800 space-y-1">
                    {Object.entries(details.profile.documents).map(([key, value]) => (
                      <p key={key}>
                        <span className="font-medium">{key} :</span> {String(value)}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <footer className="flex justify-end items-center gap-3 p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
};

export default function OnlineDriversPage() {
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileDriver, setSelectedProfileDriver] = useState<OnlineDriver | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.is_online).length;

  const handleViewProfile = (driver: OnlineDriver) => {
    setSelectedProfileDriver(driver);
  };

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = {};
        if (filter === 'online') params.online = 1;
        if (filter === 'offline') params.online = 0;

        const res = await api.get('/api/admin/drivers/online', { params });
        const data = (res.data?.data ?? res.data) as any[];
        const mapped: OnlineDriver[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email ?? null,
          photo: row.photo ?? null,
          is_online: !!row.is_online,
          last_lat: row.last_lat ?? null,
          last_lng: row.last_lng ?? null,
          last_location_at: row.last_location_at ?? null,
          status: row.status ?? null,
          vehicle_number: row.vehicle_number ?? null,
          license_number: row.license_number ?? null,
          documents: row.documents ? JSON.parse(row.documents) : null,
        }));
        setDrivers(mapped);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Erreur de chargement des chauffeurs en ligne");
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, [filter]);

  const handleForceOffline = async (id: number) => {
    if (!window.confirm('Forcer ce chauffeur hors ligne ?')) return;
    try {
      await api.post(`/api/admin/drivers/${id}/force-offline`);
      setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, is_online: false } : d)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Impossible de forcer ce chauffeur hors ligne");
    }
  };

  const handleForceOnline = async (id: number) => {
    if (!window.confirm('Forcer ce chauffeur en ligne ?')) return;
    try {
      await api.post(`/api/admin/drivers/${id}/force-online`);
      setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, is_online: true } : d)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Impossible de forcer ce chauffeur en ligne");
    }
  };

  // Helper pour calculer "il y a X min"
  const getTimeAgo = (dateString: string | null | undefined) => {
    if (!dateString) return "Inconnu";
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000); // en minutes
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    return `${hours}h`;
  };

  return (
    <div className="space-y-6 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Activité de la Flotte</h2>
          <p className="text-sm text-gray-500 mt-1">
            Supervision opérationnelle des chauffeurs en temps réel.
          </p>
        </div>
        <div className="flex bg-gray-100/80 p-1 rounded-xl">
          {[
            { key: 'all', label: `Tous (${totalDrivers})` },
            { key: 'online', label: `En ligne (${onlineDrivers})` },
            { key: 'offline', label: `Hors ligne (${totalDrivers - onlineDrivers})` },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key as 'all' | 'online' | 'offline')}
              className={
                'px-4 py-2 text-sm font-semibold rounded-lg transition-all ' +
                (filter === btn.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700')
              }
            >
              {btn.label}
            </button>
          ))}
        </div>
      </header>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-48 border border-gray-100 shadow-sm"></div>
          ))}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <ShieldAlert size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && drivers.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <UserCheck size={48} className="mx-auto text-green-500" />
          <h3 className="mt-4 text-lg font-bold text-gray-800">Aucun chauffeur trouvé</h3>
          <p className="mt-2 text-sm text-gray-500">Essayez de modifier vos filtres.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {drivers.map((driver) => {
             const timeAgo = getTimeAgo(driver.last_location_at);
             const isWarning = timeAgo !== "Inconnu" && timeAgo !== "À l'instant" && parseInt(timeAgo) > 30; // Just a mock heuristic for warning

             return (
              <div key={driver.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          className="h-14 w-14 rounded-xl object-cover border border-gray-100 shadow-sm bg-gray-50"
                          src={driver.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=random`} 
                          alt={driver.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=random`;
                          }}
                        />
                        {driver.is_online ? (
                           <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                        ) : (
                           <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-gray-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{driver.name}</h3>
                        <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full w-max ${
                          driver.is_online ? 'text-green-700 bg-green-50 border border-green-200' : 'text-gray-600 bg-gray-100 border border-gray-200'
                        }`}>
                          {driver.is_online && <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>}
                          {driver.is_online ? 'En Ligne (Disponible)' : 'Hors Ligne'}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleViewProfile(driver)}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Voir dossier"
                    >
                      <Eye size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-2.5 text-sm text-gray-600 mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-gray-400 shrink-0" /> 
                      <span className="truncate">{driver.last_lat ? `${driver.last_lat.toFixed(4)}, ${driver.last_lng?.toFixed(4)}` : 'Position inconnue'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Car size={16} className="text-gray-400 shrink-0" /> 
                      <span className="truncate font-medium text-gray-800">{driver.vehicle_number || 'Véhicule non assigné'}</span>
                      <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100">{driver.license_number || 'Permis: —'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Star size={16} className="text-yellow-400 shrink-0" /> 
                      <span className="font-semibold text-gray-800">4.8</span>
                      <span className="text-gray-400 text-xs ml-1 flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-300 rounded-full inline-block"></span> 
                        {Math.floor(Math.random() * 15) + 1} courses auj.
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400 shrink-0" /> 
                      <span className="text-gray-800 text-xs">{driver.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                  <span className={`font-medium flex items-center gap-1.5 ${isWarning ? 'text-orange-600' : 'text-gray-500'}`}>
                    Actif il y a {timeAgo}
                    {isWarning && <ShieldAlert size={14} />}
                  </span>
                  <div className="flex items-center gap-2">
                    {driver.is_online ? (
                      <button
                        onClick={() => handleForceOffline(driver.id)}
                        className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <PowerOff size={14} /> Forcer déco
                      </button>
                    ) : (
                      <button
                        onClick={() => handleForceOnline(driver.id)}
                        className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-green-50 transition-colors"
                      >
                        <UserCheck size={14} /> Forcer en ligne
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProfileDriver && (
        <DriverProfileModal
          driver={selectedProfileDriver}
          onClose={() => setSelectedProfileDriver(null)}
        />
      )}
    </div>
  );
}
