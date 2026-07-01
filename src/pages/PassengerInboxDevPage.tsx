import { api } from '@/api/client';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Loader2, Pencil, Plus, RefreshCw, Trash2, User } from 'lucide-react';

type InboxRow = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type?: string;
  read_at?: string | null;
  created_at?: string;
};

const TYPES = ['system', 'ride', 'promo'] as const;

export default function PassengerInboxDevPage() {
  const [passengerUserId, setPassengerUserId] = useState('');
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [createTitle, setCreateTitle] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [createType, setCreateType] = useState<(typeof TYPES)[number]>('system');

  const [editRow, setEditRow] = useState<InboxRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editType, setEditType] = useState<(typeof TYPES)[number]>('system');
  const [saving, setSaving] = useState(false);

  const uid = Number.parseInt(passengerUserId.trim(), 10);

  const loadList = async () => {
    if (!Number.isFinite(uid) || uid < 1) {
      toast.error('Indiquez un ID passager numérique valide.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/dev/passenger-inbox/${uid}`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string }; status?: number } };
      toast.error(err?.response?.data?.error || `Erreur ${err?.response?.status ?? ''}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async () => {
    if (!Number.isFinite(uid) || uid < 1) {
      toast.error('ID passager requis pour créer une notification.');
      return;
    }
    if (!createTitle.trim() || !createMessage.trim()) {
      toast.error('Titre et message requis.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/admin/dev/passenger-inbox', {
        user_id: uid,
        title: createTitle.trim(),
        message: createMessage.trim(),
        type: createType,
      });
      toast.success('Notification créée');
      setCreateTitle('');
      setCreateMessage('');
      setCreateType('system');
      await loadList();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Échec création');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (r: InboxRow) => {
    setEditRow(r);
    setEditTitle(r.title);
    setEditMessage(r.message);
    const t = (r.type || 'system').toLowerCase();
    setEditType(TYPES.includes(t as (typeof TYPES)[number]) ? (t as (typeof TYPES)[number]) : 'system');
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editTitle.trim() || !editMessage.trim()) {
      toast.error('Titre et message requis.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/admin/dev/passenger-inbox/${editRow.id}`, {
        title: editTitle.trim(),
        message: editMessage.trim(),
        type: editType,
      });
      toast.success('Notification mise à jour');
      setEditRow(null);
      await loadList();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Échec mise à jour');
    } finally {
      setSaving(false);
    }
  };

  /** Retourne true si la ligne a bien été supprimée (ou false si annulé / erreur). */
  const removeRow = async (r: InboxRow): Promise<boolean> => {
    if (!window.confirm(`Supprimer la notification #${r.id} ?`)) return false;
    setSaving(true);
    try {
      await api.delete(`/api/admin/dev/passenger-inbox/${r.id}`);
      toast.success('Supprimée');
      await loadList();
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || 'Échec suppression');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-primary" size={28} />
          Inbox passager (app Notifications)
        </h1>
        <p className="text-gray-500 mt-2">
          Gérez les lignes affichées dans l’app passager pour un <strong>utilisateur rôle passager</strong> (ID depuis la page Passagers).
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ID utilisateur passager</label>
            <input
              type="number"
              min={1}
              value={passengerUserId}
              onChange={(e) => setPassengerUserId(e.target.value)}
              placeholder="ex. 42"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-marine rounded-xl hover:opacity-90 disabled:opacity-50 font-bold"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            Charger la liste
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Plus size={20} className="text-primary" />
          Nouvelle notification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Titre</label>
            <input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary"
              placeholder="Titre"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
            <textarea
              value={createMessage}
              onChange={(e) => setCreateMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-primary resize-y"
              placeholder="Contenu"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as (typeof TYPES)[number])}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void createNotification()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Créer pour ce passager
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User size={18} className="text-gray-400" />
          <h2 className="font-bold text-gray-900">Notifications chargées</h2>
          <span className="text-sm text-gray-500">({rows.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Lu</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Modification</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Suppression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-mono text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-gray-900 truncate">{r.title}</div>
                    <div className="text-gray-500 truncate text-xs mt-0.5">{r.message}</div>
                  </td>
                  <td className="px-4 py-3">{r.type ?? 'system'}</td>
                  <td className="px-4 py-3">{r.read_at ? 'Oui' : 'Non'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/15 font-semibold text-xs sm:text-sm"
                    >
                      <Pencil size={16} /> Modifier
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => void removeRow(r)}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold text-xs sm:text-sm disabled:opacity-50"
                    >
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <p className="p-8 text-center text-gray-400 text-sm">Chargez un ID passager pour afficher les lignes.</p>
          )}
        </div>
      </div>

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditRow(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Modifier #{editRow.id}</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Titre</label>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as (typeof TYPES)[number])}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  if (!editRow) return;
                  void (async () => {
                    const ok = await removeRow(editRow);
                    if (ok) setEditRow(null);
                  })();
                }}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-semibold text-sm disabled:opacity-50"
              >
                <Trash2 size={18} />
                Supprimer cette notification
              </button>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditRow(null)} className="px-4 py-2.5 rounded-xl bg-gray-100 font-semibold text-gray-700">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-primary text-marine disabled:opacity-50 font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
