import React, { useEffect, useState } from 'react';
import { Check, X, Eye, FileText, UserCheck, Inbox, XCircle } from 'lucide-react';
import { api } from '@/api/client';
import { getStoragePublicUrl } from '@/utils/storagePublicUrl';

type DriverStatus = 'pending' | 'approved' | 'rejected';

// Type représentant un chauffeur
interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  vehicle_number: string;
  license_number: string;
  status: DriverStatus | string;
  documents: Record<string, string>;
  submission_date: string;
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
  const normalized = status?.toLowerCase?.() ?? 'default';
  const isKnown = ['pending', 'approved', 'rejected'].includes(normalized);
  const key: keyof typeof statusStyles = isKnown ? (normalized as DriverStatus) : 'default';
  const style = statusStyles[key];
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function PendingDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [details, setDetails] = useState<DriverProfileDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/admin/drivers/pending');
        const data = (res.data?.data ?? res.data) as any[];
        const mapped: Driver[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email ?? '',
          vehicle_number: row.vehicle_number ?? '',
          license_number: row.license_number ?? '',
          status: row.status ?? 'pending',
          documents: {},
          submission_date: row.created_at ?? new Date().toISOString(),
        }));
        setDrivers(mapped);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Erreur de chargement des chauffeurs en attente");
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Fetch driver details when selected
  useEffect(() => {
    if (!selectedDriver) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      setDetailsError(null);
      try {
        const res = await api.get(`/api/admin/drivers/${selectedDriver.id}/profile`);
        setDetails(res.data as DriverProfileDetails);
      } catch (e: any) {
        setDetailsError(e?.response?.data?.message || "Erreur de chargement du dossier du chauffeur");
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedDriver?.id]);

  const pendingDrivers = drivers.filter(driver => driver.status === 'pending');

  const handleAction = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/api/admin/drivers/${id}/status`, { status });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
      if (selectedDriver?.id === id) {
        setSelectedDriver(null);
        setDetails(null);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Impossible de mettre à jour le statut du chauffeur");
    }
  };

  const formatDocName = (key: string) => {
    switch (key) {
      case 'id_card': return "Pièce d'identité";
      case 'vehicle_photo': return "Photo du véhicule";
      case 'driver_license': return "Permis de conduire";
      default: return key;
    }
  };

  const profileStatus = details?.profile?.status ?? selectedDriver?.status ?? 'pending';

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
      
      {/* ---------------- MASTERS (LISTE) ---------------- */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
        <header className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0D47A1] font-rajdhani">Dossiers en attente</h2>
            <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-200">
              {pendingDrivers.length}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Nouveaux chauffeurs à valider</p>
        </header>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
               <div className="w-6 h-6 border-2 border-[#FDD835] border-t-[#0D47A1] rounded-full animate-spin"></div>
            </div>
          )}
          {error && <p className="text-xs text-red-600 p-2 bg-red-50 rounded-lg">{error}</p>}
          
          {!loading && pendingDrivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
              <UserCheck size={40} className="text-green-400 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Aucun dossier</p>
              <p className="text-xs mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            pendingDrivers.map((driver) => {
              const isSelected = selectedDriver?.id === driver.id;
              return (
                <button
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500' 
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      className="h-10 w-10 rounded-full border border-gray-200" 
                      src={`https://ui-avatars.com/api/?name=${driver.name.replace(' ', '+')}&background=random`} 
                      alt="" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                        {driver.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{driver.phone}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(driver.submission_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-[10px] font-bold text-[#0D47A1] group-hover:underline">Voir détails &rarr;</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------- DETAILS (DOSSIER) ---------------- */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!selectedDriver ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <Inbox size={40} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-700 font-rajdhani">Aucun dossier sélectionné</h3>
            <p className="text-sm mt-2 max-w-sm">Sélectionnez un chauffeur dans la liste de gauche pour examiner ses informations et documents.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <header className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 font-rajdhani">Examen du dossier</h3>
                <p className="text-sm text-gray-500">Validation de {selectedDriver.name}</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => handleAction(selectedDriver.id, 'rejected')} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2">
                    <X size={16} /> Rejeter
                 </button>
                 <button onClick={() => handleAction(selectedDriver.id, 'approved')} className="px-4 py-2 text-sm font-bold text-marine bg-primary rounded-xl hover:opacity-90 shadow-md shadow-primary/20 transition-all flex items-center gap-2">
                    <Check size={16} /> Approuver
                 </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
              {loadingDetails && (
                <div className="flex flex-col items-center justify-center py-10">
                   <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {detailsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                  <XCircle size={20} />
                  <p className="text-sm font-medium">{detailsError}</p>
                </div>
              )}

              {details && !loadingDetails && (
                <>
                  <section className="flex flex-col md:flex-row gap-6 items-start bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex-shrink-0">
                      <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md">
                        {details.profile?.photo || details.user.photo ? (
                          <img
                            src={getStoragePublicUrl(details.profile?.photo || details.user.photo) || ''}
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
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-1">Informations personnelles</h4>
                        <p className="text-lg text-gray-900 font-bold">{details.user.name}</p>
                        <p className="text-sm text-gray-600">{details.user.phone}</p>
                        <div className="mt-2">
                          <StatusBadge status={profileStatus} />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-1">Informations véhicule</h4>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm"><span className="text-gray-500">Immatriculation :</span> <span className="font-semibold text-gray-900">{details.profile?.vehicle_number || details.user.vehicle_number || '—'}</span></p>
                          <p className="text-sm"><span className="text-gray-500">Droit Taxi :</span> <span className="font-semibold text-gray-900">{details.profile?.license_number || details.user.license_number || '—'}</span></p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section Documents */}
                  {details.profile?.documents && Object.keys(details.profile.documents).length > 0 && (
                    <section>
                      <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2 font-rajdhani">
                        <FileText size={18} className="text-[#0D47A1]" /> 
                        Documents fournis
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(details.profile.documents).map(([key, docInfo]: [string, any]) => (
                          <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                               <span className="font-bold text-sm text-gray-800">{formatDocName(key)}</span>
                               <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${docInfo.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                                 {docInfo.status || 'Reçu'}
                               </span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col items-center justify-center bg-gray-50/50">
                              {docInfo.path ? (
                                 <a href={getStoragePublicUrl(docInfo.path) || '#'} target="_blank" rel="noreferrer" className="block w-full cursor-zoom-in relative group">
                                    <img 
                                      src={getStoragePublicUrl(docInfo.path) || ''} 
                                      alt={key} 
                                      className="max-h-56 w-full object-contain rounded-lg border border-gray-200 transition-transform group-hover:scale-[1.02] bg-white shadow-sm"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                                       <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" size={36} />
                                    </div>
                                 </a>
                              ) : (
                                 <p className="text-sm text-gray-400 italic">Format non pris en charge</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
