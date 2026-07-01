import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';

type DriverDebt = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    is_blocked: boolean;
    wallet_id: number | null;
    balance: number;
    currency: string;
    has_debt: boolean;
    debt_amount: number;
    debt_level?: 'ok' | 'notify' | 'alert' | 'blocked';
    license_plate: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
};

type PaginatedResponse = {
    data: DriverDebt[];
    current_page: number;
    last_page: number;
    total: number;
};

export default function DriversDebtsPage() {
    const [drivers, setDrivers] = useState<DriverDebt[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [onlyDebts, setOnlyDebts] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal state
    const [adjustModal, setAdjustModal] = useState<{ walletId: number; driverName: string } | null>(null);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
    const [adjustReason, setAdjustReason] = useState('');
    const [adjustLoading, setAdjustLoading] = useState(false);

    // New External Revenue Modal
    const [externalModal, setExternalModal] = useState<{ driverId: number; driverName: string } | null>(null);
    const [externalAmount, setExternalAmount] = useState('');
    const [externalNote, setExternalNote] = useState('');
    const [externalDate, setExternalDate] = useState(new Date().toISOString().split('T')[0]);
    const [externalCommissionRate, setExternalCommissionRate] = useState('80'); // 70% véhicule + 10% maintenance
    const [externalLoading, setExternalLoading] = useState(false);

    const [historyModal, setHistoryModal] = useState<{ walletId: number; driverName: string } | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const ADJUST_REASONS = [
        "Paiement espèces reçu",
        "Virement Mobile Money",
        "Dépôt Bureau",
        "Correction erreur",
        "Remise exceptionnelle",
        "Autre"
    ];

    const fetchDrivers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<PaginatedResponse>('/api/admin/drivers/debts', {
                params: {
                    only_debts: onlyDebts ? '1' : undefined,
                    search: search || undefined,
                    page,
                    per_page: 30,
                },
            });
            setDrivers(res.data.data);
            setTotalPages(res.data.last_page);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [onlyDebts, page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchDrivers();
    };

    const handleBlock = async (driverId: number) => {
        if (!confirm('Voulez-vous vraiment bloquer ce chauffeur?')) return;
        try {
            await api.post(`/api/admin/drivers/${driverId}/block`, { reason: 'Dette impayée' });
            fetchDrivers();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erreur');
        }
    };

    const handleUnblock = async (driverId: number) => {
        if (!confirm('Voulez-vous débloquer ce chauffeur?')) return;
        try {
            await api.post(`/api/admin/drivers/${driverId}/unblock`);
            fetchDrivers();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erreur');
        }
    };

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustModal || !adjustAmount || !adjustReason) return;

        setAdjustLoading(true);
        try {
            await api.post(`/api/admin/wallets/${adjustModal.walletId}/adjust`, {
                amount: parseInt(adjustAmount, 10),
                type: adjustType,
                reason: adjustReason,
            });
            setAdjustModal(null);
            setAdjustAmount('');
            setAdjustReason('');
            fetchDrivers();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erreur');
        } finally {
            setAdjustLoading(false);
        }
    };

    const handleExternalRevenueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!externalModal || !externalAmount) return;

        setExternalLoading(true);
        try {
            await api.post('/api/admin/external-revenue', {
                driver_id: externalModal.driverId,
                total_amount: parseInt(externalAmount, 10),
                commission_rate: parseInt(externalCommissionRate, 10),
                description: externalNote || "Course hors-app déclarée",
                date: externalDate,
            });
            setExternalModal(null);
            setExternalAmount('');
            setExternalNote('');
            setExternalDate(new Date().toISOString().split('T')[0]);
            fetchDrivers();
            alert("Recette enregistrée. Le chiffre d'affaires global a été mis à jour et la part de l'entreprise (80%) a été ajoutée à la dette du chauffeur.");
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setExternalLoading(false);
        }
    };

    const fetchTransactions = async (walletId: number) => {
        setHistoryLoading(true);
        try {
            const res = await api.get(`/api/admin/wallets/${walletId}/transactions`);
            setTransactions(res.data.transactions.data || []);
        } catch (e: any) {
            alert("Erreur lors du chargement de l'historique");
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleRevertAdjustment = async (tx: any) => {
        if (!historyModal) return;
        const isCredit = tx.type === 'credit';
        const revertType = isCredit ? 'debit' : 'credit';
        const actionLabel = isCredit ? "annuler ce paiement et remettre la dette" : "annuler ce débit";

        if (!confirm(`Voulez-vous vraiment ${actionLabel} de ${tx.amount} FCFA ?`)) return;

        setHistoryLoading(true);
        try {
            await api.post(`/api/admin/wallets/${historyModal.walletId}/adjust`, {
                amount: tx.amount,
                type: revertType,
                reason: `Annulation transaction #${tx.id}: ${tx.meta?.reason || 'Sans raison'}`,
            });
            await fetchTransactions(historyModal.walletId);
            fetchDrivers();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Erreur lors de l\'annulation');
        } finally {
            setHistoryLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return `${amount.toLocaleString('fr-FR')} ${currency}`;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des Dettes Chauffeurs</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Suivez les soldes, enregistrez les paiements et gérez les blocages.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={onlyDebts}
                                onChange={(e) => { setOnlyDebts(e.target.checked); setPage(1); }}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span>Dettes uniquement</span>
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par nom, téléphone..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-marine rounded-lg text-sm hover:bg-primary/90 font-bold"
                    >
                        Rechercher
                    </button>
                </form>

                {loading && <p className="text-sm text-gray-500">Chargement...</p>}
                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                {!loading && drivers.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['ID', 'Chauffeur', 'Téléphone', 'Véhicule', 'Solde', 'Dette', 'Niveau', 'Statut', 'Actions'].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {drivers.map((d) => (
                                    <tr key={d.id} className={d.has_debt ? 'bg-red-50' : ''}>
                                        <td className="px-4 py-3 text-gray-600">#{d.id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {d.license_plate || '—'}
                                            {d.vehicle_make && ` (${d.vehicle_make})`}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${d.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(d.balance, d.currency)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.has_debt ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    ⚠️ {formatCurrency(d.debt_amount, d.currency)}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 text-xs">✓ Aucune</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const lvl = d.debt_level ?? 'ok';
                                                const cfg: Record<string, { label: string; cls: string }> = {
                                                    ok: { label: 'OK', cls: 'bg-green-100 text-green-700' },
                                                    notify: { label: 'Niv.1 · Notif', cls: 'bg-yellow-100 text-yellow-700' },
                                                    alert: { label: 'Niv.2 · Alerte', cls: 'bg-orange-100 text-orange-700' },
                                                    blocked: { label: 'Niv.3 · Blocage', cls: 'bg-red-600 text-white' },
                                                };
                                                const c = cfg[lvl];
                                                return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
                                            })()}
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.is_blocked ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                                                    🚫 Bloqué
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    🟢 Actif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 space-x-2">
                                            {d.wallet_id && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setExternalModal({ driverId: d.id, driverName: d.name });
                                                        }}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                        title="Déclarer une recette faite hors-application"
                                                    >
                                                        📊 Recette Ext.
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAdjustModal({ walletId: d.wallet_id!, driverName: d.name });
                                                            setAdjustReason(ADJUST_REASONS[0]);
                                                        }}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                        title="Enregistrer un paiement ou une correction"
                                                    >
                                                        💰 Paiement
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setHistoryModal({ walletId: d.wallet_id!, driverName: d.name });
                                                            fetchTransactions(d.wallet_id!);
                                                        }}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    >
                                                        📜 Historique
                                                    </button>
                                                </>
                                            )}
                                            {d.is_blocked ? (
                                                <button
                                                    onClick={() => handleUnblock(d.id)}
                                                    className="px-3 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200"
                                                >
                                                    Débloquer
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleBlock(d.id)}
                                                    className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                >
                                                    Bloquer
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && drivers.length === 0 && !error && (
                    <p className="text-sm text-gray-500 py-8 text-center">Aucun chauffeur trouvé.</p>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                            ‹ Précédent
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                            Page {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                            Suivant ›
                        </button>
                    </div>
                )}
            </div>

            {/* History Modal */}
            {historyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">
                                Historique des transactions — {historyModal.driverName}
                            </h2>
                            <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {historyLoading && <p className="text-center py-4 text-gray-500">Chargement...</p>}
                            {!historyLoading && transactions.length === 0 && (
                                <p className="text-center py-4 text-gray-500">Aucune transaction trouvée.</p>
                            )}
                            {!historyLoading && transactions.length > 0 && (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Raison/Détails</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {transactions.map((tx) => {
                                            const meta = typeof tx.meta === 'string' ? JSON.parse(tx.meta) : tx.meta;
                                            return (
                                                <tr key={tx.id} className="text-sm">
                                                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                                                        {new Date(tx.created_at).toLocaleString('fr-FR')}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            tx.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {tx.type === 'credit' ? 'CRÉDIT' : 'DÉBIT'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-600 font-mono text-xs">{tx.source}</td>
                                                    <td className={`px-4 py-2 font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-600">
                                                        {meta?.reason ? meta.reason : (meta?.ride_id ? `Course #${meta.ride_id}` : '—')}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {tx.source === 'admin_adjustment' && (
                                                            <button
                                                                onClick={() => handleRevertAdjustment(tx)}
                                                                className="text-red-600 hover:text-red-800 text-xs font-semibold underline"
                                                            >
                                                                Annuler / Remettre la dette
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-end">
                            <button
                                onClick={() => setHistoryModal(null)}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust Modal */}
            {adjustModal && (
                // ... (existing adjust modal code)
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Enregistrer un paiement — {adjustModal.driverName}
                        </h2>
                        <form onSubmit={handleAdjustSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'opération</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="credit"
                                            checked={adjustType === 'credit'}
                                            onChange={() => setAdjustType('credit')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-green-600 font-medium">Paiement reçu (diminue sa dette)</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            value="debit"
                                            checked={adjustType === 'debit'}
                                            onChange={() => setAdjustType('debit')}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-red-600 font-medium">Débit exceptionnel (augmente sa dette)</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Montant versé par le chauffeur (FCFA)</label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="Ex: 5000"
                                    min="1"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement / Raison</label>
                                <select
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                >
                                    {ADJUST_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAdjustModal(null)}
                                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustLoading}
                                    className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary text-marine hover:bg-primary/90 disabled:opacity-50 font-bold"
                                >
                                    {adjustLoading ? 'Enregistrement...' : 'Confirmer le paiement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* External Revenue Modal */}
            {externalModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Déclarer une recette hors-app</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Enregistrez le montant total d'une course faite sans l'application pour {externalModal.driverName}.
                            La part revenant à l'entreprise (80% par défaut : 70% location + 10% maintenance) sera calculée et ajoutée à sa dette.
                        </p>

                        <form onSubmit={handleExternalRevenueSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de la course</label>
                                <input
                                    type="date"
                                    value={externalDate}
                                    onChange={(e) => setExternalDate(e.target.value)}
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Montant TOTAL de la course (FCFA)</label>
                                <input
                                    type="number"
                                    value={externalAmount}
                                    onChange={(e) => setExternalAmount(e.target.value)}
                                    placeholder="Ex: 10000"
                                    min="1"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">
                                    C'est le montant total encaissé par le chauffeur.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Part Entreprise (%)</label>
                                    <input
                                        type="number"
                                        value={externalCommissionRate}
                                        onChange={(e) => setExternalCommissionRate(e.target.value)}
                                        min="0"
                                        max="100"
                                        required
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">
                                        Standard: 80% (70+10)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Montant dû à Kêkênon</label>
                                    <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm font-bold text-primary">
                                        {((parseInt(externalAmount || '0') * parseInt(externalCommissionRate || '0')) / 100).toLocaleString()} F
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note / Détails (Optionnel)</label>
                                <textarea
                                    value={externalNote}
                                    onChange={(e) => setExternalNote(e.target.value)}
                                    placeholder="Ex: Course Porto-Novo -> Cotonou"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 h-20"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setExternalModal(null)}
                                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={externalLoading || !externalAmount}
                                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {externalLoading ? 'Enregistrement...' : 'Enregistrer la recette'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
