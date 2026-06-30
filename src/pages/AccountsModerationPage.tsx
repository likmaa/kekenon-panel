import React, { useEffect, useState } from 'react';
import { Shield, User, Car, Clock, Search, ShieldCheck, ShieldAlert, ShieldX, X, Loader2 } from 'lucide-react';
import { api } from '@/api/client';

// --- Données Types pour la Modération ---
type ModerationQueueItem = {
  id: string;
  type: string;
  subject_id: number; // Added subject_id
  subject_type: 'driver' | 'passenger';
  subject_name: string;
  reporter_name: string;
  reason: string;
  date: string;
  status: string;
};

type ModerationLogItem = {
  id: string;
  date: string;
  moderator: string;
  action: string;
  target_name: string;
  target_type: 'driver' | 'passenger';
  reason: string;
};

// Composant pour afficher une icône en fonction du type de compte
const AccountTypeIcon = ({ type }: { type: 'driver' | 'passenger' }) => {
  if (type === 'driver') return <Car className="text-gray-500" size={18} />;
  return <User className="text-gray-500" size={18} />;
};

// Types pour les actions de modération
type ModerationAction = 'suspended' | 'banned' | 'reinstated' | 'warned';

// Composant Badge pour les actions de modération
const ActionBadge = ({ action }: { action: ModerationAction }) => {
  const config: Record<ModerationAction, { icon: JSX.Element; style: string }> = {
    suspended: { icon: <ShieldAlert size={14} />, style: 'bg-orange-100 text-orange-800' },
    banned: { icon: <ShieldX size={14} />, style: 'bg-red-100 text-red-800' },
    reinstated: { icon: <ShieldCheck size={14} />, style: 'bg-green-100 text-green-800' },
    warned: { icon: <ShieldAlert size={14} />, style: 'bg-yellow-100 text-yellow-800' },
  };
  const item = config[action] || config.warned;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${item.style}`}>{item.icon}{action.charAt(0).toUpperCase() + action.slice(1)}</span>;
};


export default function AccountsModerationPage() {
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [log, setLog] = useState<ModerationLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedCase, setSelectedCase] = useState<ModerationQueueItem | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('7');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchQueueAndLogs = async () => {
    setLoading(true);
    try {
      const [queueRes, logsRes] = await Promise.all([
        api.get('/api/admin/moderation/queue'),
        api.get('/api/admin/moderation/logs'),
      ]);

      const queueBody = queueRes.data as { data: ModerationQueueItem[] };
      const logsBody = logsRes.data as { data: ModerationLogItem[] };

      setQueue(queueBody.data);
      setLog(logsBody.data);
    } catch (e) {
      // en cas d'erreur, on laisse les listes vides
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueAndLogs();
  }, []);

  const handleModerationAction = async (action: 'suspend' | 'ban' | 'warn' | 'reinstate') => {
    if (!selectedCase) return;
    if (!actionReason.trim() && action !== 'reinstate') {
      alert('Veuillez saisir un motif.');
      return;
    }

    setProcessingAction(true);
    try {
      const payload: any = { reason: actionReason };
      if (action === 'suspend') payload.duration_days = parseInt(suspensionDays);

      await api.post(`/api/admin/moderation/${selectedCase.subject_id}/${action}`, payload);

      setSelectedCase(null);
      setActionReason('');
      fetchQueueAndLogs(); // Refresh
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Une erreur est survenue lors de l\'action de modération.');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredLog = log.filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      entry.moderator.toLowerCase().includes(q) ||
      entry.target_name.toLowerCase().includes(q) ||
      (entry.reason && entry.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Modération des Comptes</h1>
        <p className="text-sm text-gray-500 mt-1">Traitez les signalements, gérez les suspensions et consultez l'historique des actions.</p>
      </header>

      {/* Section 1: File d'attente des cas à traiter */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cas en Attente de Révision</h2>
        <div className="space-y-4">
          {queue.map(item => (
            <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <AccountTypeIcon type={item.subject_type as any} />
                <div>
                  <p className="font-semibold text-gray-800">{item.reason}</p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">{item.subject_name}</span> signalé par <span className="font-medium">{item.reporter_name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 flex-shrink-0">
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock size={14} />
                  <span>{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <button
                  onClick={() => setSelectedCase(item)}
                  className="px-4 py-1.5 text-sm bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark"
                >
                  Traiter le cas
                </button>
              </div>
            </div>
          ))}
          {queue.length === 0 && !loading && (
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <ShieldCheck size={40} className="mx-auto text-green-500" />
              <h3 className="mt-3 text-md font-semibold text-gray-800">Aucun cas en attente</h3>
              <p className="mt-1 text-sm text-gray-500">La file de modération est vide.</p>
            </div>
          )}
          {loading && <div className="text-center p-6">Chargement...</div>}
        </div>
      </div>

      {/* Section 2: Journal d'audit des actions de modération */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Journal des Actions de Modération</h2>
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, modérateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Modérateur', 'Action', 'Cible', 'Motif'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLog.map(entry => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(entry.date).toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{entry.moderator}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><ActionBadge action={entry.action as ModerationAction} /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <AccountTypeIcon type={entry.target_type as any} />
                      <span className="text-sm font-medium text-gray-800">{entry.target_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Shield className="text-primary" size={20} />
                Traiter le cas : {selectedCase.subject_name}
              </h3>
              <button onClick={() => setSelectedCase(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motif de l'action</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-24"
                  placeholder="Expliquez la raison de cette mesure de modération..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleModerationAction('warn')}
                  disabled={processingAction}
                  className="flex flex-col items-center justify-center p-4 border-2 border-yellow-100 rounded-xl hover:bg-yellow-50 transition-colors text-yellow-800"
                >
                  <ShieldAlert size={24} className="mb-2" />
                  <span className="font-semibold">Avertir</span>
                  <span className="text-[10px] text-yellow-600">Simple avertissement</span>
                </button>

                <div className="group">
                  <button
                    onClick={() => handleModerationAction('suspend')}
                    disabled={processingAction}
                    className="w-full flex flex-col items-center justify-center p-4 border-2 border-orange-100 rounded-xl hover:bg-orange-50 transition-colors text-orange-800"
                  >
                    <ShieldAlert size={24} className="mb-2" />
                    <span className="font-semibold">Suspendre</span>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Durée :</span>
                    <select
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(e.target.value)}
                      className="text-xs border rounded p-1"
                    >
                      <option value="1">1 jour</option>
                      <option value="3">3 jours</option>
                      <option value="7">7 jours</option>
                      <option value="30">30 jours</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleModerationAction('ban')}
                disabled={processingAction}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-red-800"
              >
                <ShieldX size={24} />
                <div className="text-left">
                  <p className="font-bold">Bannir Définitivement</p>
                  <p className="text-xs text-red-600">L'utilisateur ne pourra plus accéder à son compte</p>
                </div>
              </button>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
