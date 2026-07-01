import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { exportToCsv } from '@/utils/exportCsv';
import { Users, Download, RefreshCw, Star, UserPlus, Activity, Moon, Circle } from 'lucide-react';

type Segment = 'nouveau' | 'actif' | 'vip' | 'inactif' | 'occasionnel';

interface CrmRow {
  id: number;
  name: string;
  phone: string;
  registered_at: string;
  rides_count: number;
  total_spent: number;
  last_activity: string | null;
  segment: Segment;
}
interface CrmData {
  total_passengers: number;
  counts: Record<Segment, number>;
  rows: CrmRow[];
}

const segConfig: Record<Segment, { label: string; cls: string; icon: React.ElementType }> = {
  nouveau: { label: 'Nouveau', cls: 'bg-amber-100 text-amber-700', icon: UserPlus },
  actif: { label: 'Actif', cls: 'bg-green-100 text-green-700', icon: Activity },
  vip: { label: 'VIP', cls: 'bg-purple-100 text-purple-700', icon: Star },
  inactif: { label: 'Inactif', cls: 'bg-gray-200 text-gray-600', icon: Moon },
  occasionnel: { label: 'Occasionnel', cls: 'bg-amber-100 text-amber-700', icon: Circle },
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export default function CrmSegmentationPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Segment | 'all'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/stats/passengers/segments${filter !== 'all' ? `?segment=${filter}` : ''}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const segments: Segment[] = ['nouveau', 'actif', 'vip', 'inactif', 'occasionnel'];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-primary" /> CRM — Segmentation passagers
          </h1>
          <p className="text-sm text-gray-500 mt-1">Comprendre et fidéliser votre base clients.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Cartes de segments (cliquables = filtre) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`text-left p-4 rounded-xl border shadow-sm transition-all ${filter === 'all' ? 'border-primary ring-2 ring-primary/30 bg-white' : 'border-gray-100 bg-white hover:shadow-md'}`}
        >
          <p className="text-2xl font-bold text-gray-900">{data?.total_passengers ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total passagers</p>
        </button>
        {segments.map((s) => {
          const c = segConfig[s];
          const Icon = c.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-left p-4 rounded-xl border shadow-sm transition-all ${filter === s ? 'border-primary ring-2 ring-primary/30 bg-white' : 'border-gray-100 bg-white hover:shadow-md'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${c.cls}`}><Icon size={16} /></div>
              <p className="text-2xl font-bold text-gray-900">{data?.counts?.[s] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">
            {filter === 'all' ? 'Tous les passagers' : `Segment : ${segConfig[filter].label}`}
            <span className="text-gray-400 font-normal ml-2">({data?.rows.length ?? 0})</span>
          </h3>
          <button
            onClick={() => data && exportToCsv(
              `crm-${filter}`,
              ['ID', 'Nom', 'Téléphone', 'Inscription', 'Courses', 'Dépensé', 'Dernière activité', 'Segment'],
              data.rows.map((r) => [r.id, r.name, r.phone, fmtDate(r.registered_at), r.rides_count, r.total_spent, fmtDate(r.last_activity), segConfig[r.segment].label]),
            )}
            disabled={!data || data.rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Download size={14} /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Chargement...</p>
          ) : !data || data.rows.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Aucun passager dans ce segment.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Nom', 'Téléphone', 'Inscription', 'Courses', 'Dépensé', 'Dernière activité', 'Segment'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.rows.map((r) => {
                  const c = segConfig[r.segment];
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-2 text-gray-600">{r.phone}</td>
                      <td className="px-4 py-2 text-gray-600">{fmtDate(r.registered_at)}</td>
                      <td className="px-4 py-2 text-gray-700">{r.rides_count}</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">{r.total_spent.toLocaleString('fr-FR')} F</td>
                      <td className="px-4 py-2 text-gray-600">{fmtDate(r.last_activity)}</td>
                      <td className="px-4 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
