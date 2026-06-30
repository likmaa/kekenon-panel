import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/client';

interface Passenger {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Ride {
  id: number;
  status: string;
  fare_amount: number;
  currency: string;
  distance_m?: number | null;
  duration_s?: number | null;
  driver_id?: number | null;
  driver_name?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export default function PassengersDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [userRes, ridesRes] = await Promise.all([
          api.get(`/api/admin/users/${id}`),
          api.get(`/api/admin/passengers/${id}/rides`, { params: { per_page: 50 } }),
        ]);

        setPassenger(userRes.data);
        const data = (ridesRes.data?.data ?? ridesRes.data) as any[];
        setRides(
          data.map((r) => ({
            id: r.id,
            status: r.status,
            fare_amount: r.fare_amount ?? 0,
            currency: r.currency ?? 'XOF',
            distance_m: r.distance_m ?? null,
            duration_s: r.duration_s ?? null,
            driver_id: r.driver_id ?? null,
            driver_name: r.driver_name ?? null,
            created_at: r.created_at ?? null,
            completed_at: r.completed_at ?? null,
          }))
        );
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Erreur de chargement du passager');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('fr-FR');
    } catch {
      return value;
    }
  };

  const formatDistanceKm = (m?: number | null) => {
    if (!m || m <= 0) return '-';
    return `${(m / 1000).toFixed(1)} km`;
  };

  const formatDurationMin = (s?: number | null) => {
    if (!s || s <= 0) return '-';
    return `${Math.round(s / 60)} min`;
  };

  const getFilteredRides = (): Ride[] => {
    return rides
      .filter((r) => {
        if (statusFilter === 'all') return true;
        return r.status === statusFilter;
      })
      .filter((r) => {
        if (!fromDate && !toDate) return true;
        if (!r.created_at) return false;
        const d = new Date(r.created_at);
        if (fromDate) {
          const from = new Date(fromDate);
          if (d < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        return true;
      });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Détail passager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique des courses et informations principales du passager.
          </p>
        </div>
        <Link
          to="/passengers"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          Retour à la liste
        </Link>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-sm text-gray-500">
          Chargement des données du passager...
        </div>
      ) : (
        <>
          {passenger && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Informations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Nom</p>
                  <p>{passenger.name || '-'}</p>
                </div>
                <div>
                  <p className="font-medium">Téléphone</p>
                  <p>{passenger.phone || '-'}</p>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p>{passenger.email || '-'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des courses</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
              <div className="flex flex-col text-sm">
                <label className="text-gray-600 mb-1">Filtrer par statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="requested">Demandé</option>
                  <option value="accepted">Accepté</option>
                  <option value="ongoing">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              <div className="flex flex-col text-sm">
                <label className="text-gray-600 mb-1">Date min</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>
              <div className="flex flex-col text-sm">
                <label className="text-gray-600 mb-1">Date max</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                />
              </div>
            </div>
            {getFilteredRides().length === 0 ? (
              <p className="text-sm text-gray-500">Aucune course trouvée pour ce passager.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Chauffeur</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Créée le</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Terminée le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getFilteredRides().map((ride) => (
                      <tr key={ride.id}>
                        <td className="px-4 py-2 whitespace-nowrap">#{ride.id}</td>
                        <td className="px-4 py-2 whitespace-nowrap capitalize">{ride.status}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {ride.fare_amount} {ride.currency}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDistanceKm(ride.distance_m ?? null)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDurationMin(ride.duration_s ?? null)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{ride.driver_id ? `#${ride.driver_id}` : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(ride.created_at)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(ride.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
