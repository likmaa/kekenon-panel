
import React, { useEffect, useState, useRef } from 'react'
import { api } from '@/api/client'
import { RefreshCw, Terminal, AlertCircle, Trash2, AlertTriangle } from 'lucide-react'

export default function DeveloperToolsPage() {
  const [logs, setLogs] = useState<string>('')
  const [mobileLogs, setMobileLogs] = useState<string>('')
  const [logView, setLogView] = useState<'server' | 'mobile'>('server')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetResult, setResetResult] = useState<{ ok: boolean; message: string; deleted?: Record<string, number> } | null>(null)

  // Purge state
  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [purgeLoading, setPurgeLoading] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const [serverLogsRes, mobileLogsRes] = await Promise.all([
        api.get('/api/admin/dev/logs'),
        api.get('/api/admin/dev/mobile-logs')
      ])
      setLogs(serverLogsRes.data.content)
      setMobileLogs(mobileLogsRes.data.content)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || 'Erreur lors de la récupération des logs')
    } finally {
      setLoading(false)
    }
  }

  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET_ALL_DATA') {
      alert('Veuillez taper exactement: RESET_ALL_DATA')
      return
    }

    setResetLoading(true)
    setResetResult(null)
    try {
      const res = await api.post('/api/admin/dev/reset-data', { confirm: 'RESET_ALL_DATA' })
      setResetResult({ ok: true, message: res.data.message, deleted: res.data.deleted })
      setShowResetModal(false)
      setResetConfirmText('')
      fetchLogs() // Refresh logs
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Erreur lors de la réinitialisation';
      setResetResult({ ok: false, message: errorMsg })
    } finally {
      setResetLoading(false)
    }
  }

  const handlePurgeStats = async () => {
    if (purgeConfirmText !== 'PURGE_STATS_ONLY') {
      alert('Veuillez taper exactement: PURGE_STATS_ONLY')
      return
    }

    setPurgeLoading(true)
    setResetResult(null)
    try {
      const res = await api.post('/api/admin/dev/purge-stats', { confirm: 'PURGE_STATS_ONLY' })
      setResetResult({ ok: true, message: res.data.message })
      setShowPurgeModal(false)
      setPurgeConfirmText('')
      fetchLogs()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Erreur lors de la purge';
      setResetResult({ ok: false, message: errorMsg })
    } finally {
      setPurgeLoading(false)
    }
  }

  const handleClearCache = async () => {
    setLoading(true)
    setResetResult(null)
    try {
      const res = await api.post('/api/admin/dev/clear-cache')
      setResetResult({ ok: true, message: res.data.message })
      fetchLogs()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Erreur lors du vidage du cache';
      setResetResult({ ok: false, message: errorMsg })
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  return (
    <div className="space-y-4 h-[calc(100vh-100px)] flex flex-col">
      {/* Reset/Purge Result Alert */}
      {resetResult && (
        <div className={`px-4 py-3 rounded flex items-center gap-2 ${resetResult.ok
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          {resetResult.ok ? '✅' : <AlertCircle size={20} />}
          <span>{resetResult.message}</span>
          {resetResult.deleted && (
            <div className="text-xs ml-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-1">
              {Object.entries(resetResult.deleted).map(([key, value]) => (
                <div key={key}>
                  <span className="opacity-70">{key}:</span> {value}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setResetResult(null)} className="ml-auto text-gray-500 hover:text-gray-700">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="text-gray-700" />
          <h1 className="text-xl font-bold text-gray-800">Outils Développeur</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPurgeModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            <Trash2 size={16} />
            Purger les statistiques
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <AlertTriangle size={16} />
            Tout réinitialiser
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button
            onClick={handleClearCache}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Vider le cache
          </button>
          {logView === 'mobile' && (
            <button
              onClick={async () => {
                if (confirm('Effacer les logs mobiles ?')) {
                  await api.post('/api/admin/dev/mobile-logs/clear');
                  fetchLogs();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Trash2 size={16} />
              Effacer logs mobiles
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Explication Data Info */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex gap-3 text-amber-800 text-sm">
        <AlertCircle size={20} className="shrink-0" />
        <div>
          <p className="font-semibold mb-1">Information sur les données</p>
          <p>Toutes les statistiques affichées dans les panels (Finances, Flotte, Statistiques) proviennent de la base de données réelle. Les données ne sont pas simulées.</p>
        </div>
      </div>


      <div className="flex-1 bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-700 flex flex-col shadow-xl">
        <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex bg-[#1a1a1a] rounded-md p-0.5 border border-gray-600">
              <button
                onClick={() => setLogView('server')}
                className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${logView === 'server' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Serveur (Laravel)
              </button>
              <button
                onClick={() => setLogView('mobile')}
                className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${logView === 'mobile' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Mobile (APKs)
              </button>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            {logView === 'server' ? 'storage/logs/laravel.log' : 'storage/logs/mobile_errors.log'}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap">
          {logView === 'server' ? (
            logs ? logs : <span className="text-gray-500 italic">Aucun log serveur disponible.</span>
          ) : (
            mobileLogs ? mobileLogs : <span className="text-gray-500 italic">Aucun log mobile disponible.</span>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={28} />
              <h2 className="text-xl font-bold">Réinitialiser TOUTES les données</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">⚠️ ACTION CRITIQUE:</p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Supprime TOUTES les courses, adresses, favoris</li>
                <li>Supprime TOUTES les transactions et notifications</li>
                <li>Remet tous les portefeuilles à 0</li>
                <li>Efface les logs serveur</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Pour confirmer, tapez <code className="bg-gray-100 px-2 py-1 rounded font-mono text-red-600">RESET_ALL_DATA</code>
            </p>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET_ALL_DATA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowResetModal(false); setResetConfirmText(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleResetData}
                disabled={resetLoading || resetConfirmText !== 'RESET_ALL_DATA'}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? 'Réinitialisation...' : '🗑️ Tout supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <Trash2 size={28} />
              <h2 className="text-xl font-bold">Purger les statistiques</h2>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-2">Cette action va :</p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>Supprimer toutes les courses</li>
                <li>Supprimer toutes les transactions wallet</li>
                <li>Supprimer tous les avis (ratings)</li>
                <li>Remettre les soldes des portefeuilles à 0</li>
                <li className="font-bold">GARDERA les comptes utilisateurs (zems & passagers)</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Pour confirmer, tapez <code className="bg-gray-100 px-2 py-1 rounded font-mono text-amber-600">PURGE_STATS_ONLY</code>
            </p>
            <input
              type="text"
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder="PURGE_STATS_ONLY"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPurgeModal(false); setPurgeConfirmText(''); }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handlePurgeStats}
                disabled={purgeLoading || purgeConfirmText !== 'PURGE_STATS_ONLY'}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purgeLoading ? 'Purge en cours...' : '🗑️ Purger Stats'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

