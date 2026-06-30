import React, { useEffect, useState } from 'react';
import { Check, X, Eye, FileText, XCircle, UserCheck } from 'lucide-react';
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

// Le composant StatusBadge reste le même
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

const DriverDetailsModal = ({ driver, onClose, onAction }: { driver: Driver | null; onClose: () => void; onAction: (id: number, status: 'approved' | 'rejected') => void }) => {
  const [details, setDetails] = useState<DriverProfileDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!driver) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/admin/drivers/${driver.id}/profile`);
        setDetails(res.data as DriverProfileDetails);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Erreur de chargement du dossier du chauffeur");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [driver?.id]);

  if (!driver) return null;

  const profileStatus = details?.profile?.status ?? driver.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Dossier du Chauffeur : {driver.name}</h3>
          <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"><XCircle size={24} /></button>
        </header>
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading && <p className="text-sm text-gray-500">Chargement du dossier...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {details && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
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
                <div className="md:col-span-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Informations personnelles</h4>
                  <p className="text-sm text-gray-800"><span className="font-medium">Nom :</span> {details.user.name}</p>
                  <p className="text-sm text-gray-800"><span className="font-medium">Téléphone :</span> {details.user.phone}</p>
                  <p className="text-sm text-gray-800"><span className="font-medium">Rôle actuel :</span> {details.user.role || '—'}</p>
                </div>
                <div className="md:col-span-1">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Profil chauffeur</h4>
                  <p className="text-sm text-gray-800 flex items-center gap-2"><span className="font-medium">Statut :</span> <StatusBadge status={profileStatus} /></p>
                  <p className="text-sm text-gray-800"><span className="font-medium">Immatriculation :</span> {details.profile?.vehicle_number || details.user.vehicle_number || '—'}</p>
                  <p className="text-sm text-gray-800"><span className="font-medium">Droit Taxi :</span> {details.profile?.license_number || details.user.license_number || '—'}</p>
                </div>
              </section>

              {details.profile?.documents && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FileText size={16} /> Documents transmis</h4>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-800 space-y-1">
                    {Object.entries(details.profile.documents).map(([key, value]) => (
                      <p key={key}><span className="font-medium">{key} :</span> {String(value)}</p>
                    ))}
                  </div>
                </section>
              )}

              {details.profile && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                  <p><span className="font-medium">Créé le :</span> {details.profile.created_at ? new Date(details.profile.created_at).toLocaleString('fr-FR') : '—'}</p>
                  <p><span className="font-medium">Mis à jour le :</span> {details.profile.updated_at ? new Date(details.profile.updated_at).toLocaleString('fr-FR') : '—'}</p>
                </section>
              )}
            </>
          )}
        </div>
        <footer className="flex justify-end items-center gap-3 p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50">Fermer</button>
          {profileStatus === 'pending' && (
            <>
              <button onClick={() => onAction(driver.id, 'rejected')} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2"><X size={16} /> Rejeter</button>
              <button onClick={() => onAction(driver.id, 'approved')} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"><Check size={16} /> Approuver</button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};


export default function PendingDriversPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/admin/drivers/pending');
        // L'API renvoie un paginator Laravel, on récupère data ou items
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

  // --- LOGIQUE DE FILTRAGE ---
  // On filtre les données pour ne garder que les chauffeurs avec le statut 'pending'
  const pendingDrivers = drivers.filter(driver => driver.status === 'pending');
  // -------------------------

  const handleAction = (id: number, status: 'approved' | 'rejected') => {
    const run = async () => {
      try {
        await api.patch(`/api/admin/drivers/${id}/status`, { status });
        setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      } catch (e: any) {
        alert(e?.response?.data?.message || "Impossible de mettre à jour le statut du chauffeur");
      } finally {
        setModalOpen(false);
      }
    };

    run();
  };

  const handleViewDetails = (driver: Driver) => {
    setSelectedDriver(driver);
    setModalOpen(true);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <header className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Chauffeurs en Attente de Validation</h2>
          <p className="text-sm text-gray-500 mt-1">Examinez les dossiers pour approuver ou rejeter les nouvelles candidatures.</p>
        </header>

        {loading && <p className="text-sm text-gray-500">Chargement des chauffeurs en attente...</p>}
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        {/* --- GESTION DE L'ÉTAT VIDE --- */}
        {!loading && pendingDrivers.length === 0 ? (
          <div className="text-center p-10 bg-gray-50 rounded-lg border-2 border-dashed">
            <UserCheck size={48} className="mx-auto text-green-500" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">Aucun dossier en attente</h3>
            <p className="mt-1 text-sm text-gray-500">Excellent travail ! Toutes les candidatures ont été traitées.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  {['Chauffeur', 'Date de soumission', 'Actions'].map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingDrivers.map((driver: Driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${driver.name.replace(' ', '+')}&background=random`} alt="" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(driver.submission_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(driver)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                          <Eye size={14} />
                          Voir Dossier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* --------------------------------- */}
      </div>

      {isModalOpen && (
        <DriverDetailsModal
          driver={selectedDriver}
          onClose={() => setModalOpen(false)}
          onAction={handleAction}
        />
      )}
    </>
  );
}
