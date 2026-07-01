import React, { useEffect, useState } from 'react';
import { Search, PlusCircle, SlidersHorizontal, User, CheckCircle, PauseCircle, AlertTriangle, Download } from 'lucide-react';
import { api } from '@/api/client';
import { exportToCsv } from '@/utils/exportCsv';

// Interfaces et Types
type DriverStatus = 'active' | 'suspended' | 'pending';
interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: DriverStatus;
  vehicle_model: string;
  vehicle_number: string;
  rating: number | null;
  join_date: string;
}

type DriverDocumentsRow = {
  driver_id: number;
  driver_name: string | null;
  driver_phone: string | null;
  driver_email: string | null;
  driver_status: string | null;
  profile_updated_at: string | null;
  documents_count: number;
  documents: Array<{
    key: string;
    label: string;
    status: string;
    expiry: string | null;
    raw_value: string | null;
    file_url: string | null;
  }>;
};

// Composant Badge de Statut (légèrement adapté pour la flotte)
const FleetStatusBadge = ({ status }: { status: DriverStatus }) => {
  const statusConfig = {
    active: { icon: <CheckCircle size={14} />, style: 'bg-green-100 text-green-800' },
    suspended: { icon: <PauseCircle size={14} />, style: 'bg-orange-100 text-orange-800' },
    pending: { icon: <AlertTriangle size={14} />, style: 'bg-yellow-100 text-yellow-800' },
  };
  const config = statusConfig[status] || { icon: null, style: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.style}`}>
      {config.icon}
      {status === 'active' ? 'Actif' : status === 'suspended' ? 'Suspendu' : status === 'pending' ? 'En attente' : status}
    </span>
  );
};

export default function FleetManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driverIdForDocs, setDriverIdForDocs] = useState('');
  const [driverDocsLoading, setDriverDocsLoading] = useState(false);
  const [driverDocs, setDriverDocs] = useState<DriverDocumentsRow[]>([]);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  // §20.7 — Rentabilité par véhicule
  type FleetRow = {
    driver_id: number; driver_name: string; license_plate: string | null; vehicle: string | null;
    rides_count: number; gross_revenue: number; platform_commission: number; driver_earnings: number;
    distance_km: number; debt_amount: number;
  };
  const [fleetRows, setFleetRows] = useState<FleetRow[]>([]);
  const [fleetPeriod, setFleetPeriod] = useState<number>(30);

  useEffect(() => {
    api.get(`/api/admin/finance/fleet-economics?days=${fleetPeriod}`)
      .then((r) => setFleetRows(r.data?.rows ?? []))
      .catch(() => setFleetRows([]));
  }, [fleetPeriod]);

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Tous les users avec role=driver
        const usersRes = await api.get('/api/admin/users', { params: { role: 'driver', per_page: 200 } });
        const users = (usersRes.data?.data ?? usersRes.data) as any[];

        // 2) Drivers en pending (driver_profiles.status = pending)
        const pendingRes = await api.get('/api/admin/drivers/pending');
        const pending = (pendingRes.data?.data ?? pendingRes.data) as any[];
        const pendingIds = new Set<number>(pending.map((p) => p.id));

        const mapped: Driver[] = users.map((u) => {
          let status: DriverStatus = 'active';
          if (pendingIds.has(u.id)) {
            status = 'pending';
          } else if (u.is_active === false) {
            status = 'suspended';
          }

          const profile = u.driver_profile;

          return {
            id: u.id,
            name: u.name ?? '',
            phone: u.phone ?? '',
            email: u.email ?? '',
            status,
            vehicle_model: profile?.vehicle_model ? `${profile.vehicle_make || ''} ${profile.vehicle_model}`.trim() : (u.vehicle_number ? 'Véhicule enregistré' : 'N/A'),
            vehicle_number: profile?.vehicle_number || u.vehicle_number || 'N/A',
            rating: u.ratings_avg_stars ? Number(u.ratings_avg_stars) : null,
            join_date: u.created_at ?? new Date().toISOString(),
          };
        });

        setDrivers(mapped);
      } catch (e: any) {
        setError(e?.response?.data?.message || "Erreur de chargement de la flotte");
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Logique de filtrage et de recherche
  const filteredData = drivers
    .filter(driver => {
      if (statusFilter === 'all') return true;
      return driver.status === statusFilter;
    })
    .filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm) ||
      driver.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleLoadDriverDocuments = async () => {
    setDriverDocsLoading(true);
    setDocError(null);
    try {
      const rawId = driverIdForDocs.trim();
      const driverId = rawId ? Number(rawId) : null;
      if (rawId && (!Number.isInteger(driverId) || (driverId as number) <= 0)) {
        setDocError('Veuillez saisir un ID chauffeur valide (entier > 0).');
        setDriverDocsLoading(false);
        return;
      }

      const params = driverId ? { driver_id: driverId } : undefined;
      const res = await api.get('/api/admin/dev/drivers/documents', { params });
      const rows = Array.isArray(res.data?.items) ? res.data.items : [];
      setDriverDocs(rows);
    } catch (e: any) {
      setDocError(e?.response?.data?.message || 'Erreur lors du chargement des documents chauffeur');
    } finally {
      setDriverDocsLoading(false);
    }
  };

  const handleValidateDriverDocument = async (
    driverId: number,
    documentKey: string,
    status: 'valid' | 'rejected' | 'pending',
  ) => {
    const actionKey = `${driverId}:${documentKey}:${status}`;
    setDocActionLoading(actionKey);
    setDocError(null);
    try {
      await api.post('/api/admin/dev/drivers/documents/validate', {
        driver_id: driverId,
        document_key: documentKey,
        status,
      });
      await handleLoadDriverDocuments();
    } catch (e: any) {
      setDocError(e?.response?.data?.message || 'Erreur lors de la mise à jour du statut document');
    } finally {
      setDocActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Gestion de la Flotte</h1>
        <p className="text-sm text-gray-500 mt-1">Visualisez, recherchez et gérez l'ensemble de vos chauffeurs.</p>
      </header>

      {/* §20.7 — Rentabilité par véhicule */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rentabilité par véhicule</h2>
            <p className="text-sm text-gray-500">CA généré, commission plateforme, gains chauffeur et dette par véhicule.</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setFleetPeriod(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${fleetPeriod === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {d} j
                </button>
              ))}
            </div>
            <button
              onClick={() => exportToCsv(
                `rentabilite-flotte-${fleetPeriod}j`,
                ['Chauffeur', 'Plaque', 'Véhicule', 'Courses', 'CA généré', 'Commission plateforme', 'Gains chauffeur', 'Distance (km)', 'Dette'],
                fleetRows.map((r) => [r.driver_name, r.license_plate ?? '', r.vehicle ?? '', r.rides_count, r.gross_revenue, r.platform_commission, r.driver_earnings, r.distance_km, r.debt_amount]),
              )}
              disabled={fleetRows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Véhicule / Chauffeur', 'Courses', 'CA généré', 'Commission', 'Gains chauffeur', 'Distance', 'Dette'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fleetRows.map((r) => (
                <tr key={r.driver_id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.license_plate || '—'}</div>
                    <div className="text-xs text-gray-500">{r.vehicle || ''} · {r.driver_name}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.rides_count}</td>
                  <td className="px-3 py-2 font-semibold text-gray-900">{r.gross_revenue.toLocaleString('fr-FR')} F</td>
                  <td className="px-3 py-2 text-emerald-700">{r.platform_commission.toLocaleString('fr-FR')} F</td>
                  <td className="px-3 py-2 text-indigo-700">{r.driver_earnings.toLocaleString('fr-FR')} F</td>
                  <td className="px-3 py-2 text-gray-600">{r.distance_km} km</td>
                  <td className={`px-3 py-2 ${r.debt_amount > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {r.debt_amount > 0 ? `${r.debt_amount.toLocaleString('fr-FR')} F` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fleetRows.length === 0 && <p className="text-sm text-gray-500 mt-3">Aucune course terminée sur la période.</p>}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Carburant, versement investisseur et marge nette ne sont pas encore suivis (aucune donnée dans le modèle). Leur ajout nécessite une saisie des coûts par véhicule — à planifier si besoin.
        </p>
      </div>

      {/* Carte principale contenant les outils et le tableau */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {loading && <p className="text-sm text-gray-500">Chargement des chauffeurs...</p>}
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {/* Barre d'outils : Recherche, Filtres, Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, tél, plaque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="pending">En attente</option>
            </select>
            <button className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-primary text-marine rounded-lg hover:bg-primary-dark transition-colors font-bold">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Ajouter un chauffeur</span>
            </button>
          </div>
        </div>

        {/* Tableau des chauffeurs */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['Chauffeur', 'Véhicule', 'Note', 'Statut', 'Actions'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((driver) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{driver.vehicle_model}</div>
                    <div className="text-sm text-gray-500">{driver.vehicle_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {driver.rating ? `⭐ ${driver.rating.toFixed(1)}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <FleetStatusBadge status={driver.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:underline">
                      Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="text-center p-10">
            <User size={48} className="mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">Aucun chauffeur trouvé</h3>
            <p className="mt-1 text-sm text-gray-500">Essayez d'ajuster votre recherche ou vos filtres.</p>
          </div>
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
        <p className="font-semibold text-indigo-900 mb-1">Documents chauffeurs (envoyés depuis l’app)</p>
        <p className="text-sm text-indigo-800 mb-3">
          Recherche tous les documents soumis, ou filtre un chauffeur précis avec son ID.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="number"
            min={1}
            value={driverIdForDocs}
            onChange={(e) => setDriverIdForDocs(e.target.value)}
            placeholder="ID chauffeur (optionnel)"
            className="w-full sm:w-64 border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleLoadDriverDocuments}
            disabled={driverDocsLoading}
            className="px-4 py-2 bg-primary text-marine rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
          >
            {driverDocsLoading ? 'Chargement...' : 'Charger les documents'}
          </button>
        </div>

        {docError && <p className="text-xs text-red-700 mb-2">{docError}</p>}

        {driverDocs.length > 0 ? (
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {driverDocs.map((row) => (
              <div key={row.driver_id} className="bg-white border border-indigo-100 rounded-lg p-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
                  <span className="font-semibold text-gray-900">#{row.driver_id} {row.driver_name || 'Chauffeur'}</span>
                  <span className="text-gray-600">{row.driver_phone || 'Téléphone non renseigné'}</span>
                  <span className="text-gray-500">Statut: {row.driver_status || '—'}</span>
                </div>
                {row.documents_count > 0 ? (
                  <div className="space-y-1">
                    {row.documents.map((doc) => (
                      <div key={`${row.driver_id}-${doc.key}`} className="text-xs text-gray-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{doc.label}:</span>
                        <span className="uppercase">{doc.status}</span>
                        <span>{doc.expiry || '—'}</span>
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Ouvrir
                          </a>
                        ) : (
                          <span className="text-gray-400">Aucun fichier</span>
                        )}
                        <button
                          onClick={() => handleValidateDriverDocument(row.driver_id, doc.key, 'valid')}
                          disabled={docActionLoading === `${row.driver_id}:${doc.key}:valid`}
                          className="ml-1 px-2 py-0.5 rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleValidateDriverDocument(row.driver_id, doc.key, 'rejected')}
                          disabled={docActionLoading === `${row.driver_id}:${doc.key}:rejected`}
                          className="px-2 py-0.5 rounded bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleValidateDriverDocument(row.driver_id, doc.key, 'pending')}
                          disabled={docActionLoading === `${row.driver_id}:${doc.key}:pending`}
                          className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                        >
                          En attente
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Aucun document enregistré.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-indigo-800/80">
            Aucun résultat affiché pour le moment. Clique sur "Charger les documents".
          </p>
        )}
      </div>
    </div>
  );
}
