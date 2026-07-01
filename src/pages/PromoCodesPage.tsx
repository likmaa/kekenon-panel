import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import {
    Plus,
    Trash2,
    Edit2,
    CheckCircle,
    XCircle,
    Loader2,
    Tag
} from 'lucide-react';

interface PromoCode {
    id: number;
    code: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    city: string | null;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
}

export default function PromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [code, setCode] = useState('');
    const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
    const [value, setValue] = useState('');
    const [city, setCity] = useState('');
    const [maxUses, setMaxUses] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [isActive, setIsActive] = useState(true);

    const fetchPromoCodes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/promo-codes');
            setPromoCodes(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erreur lors du chargement des codes promos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const openModal = (promo: PromoCode | null = null) => {
        if (promo) {
            setEditingPromo(promo);
            setCode(promo.code);
            setType(promo.type);
            setValue(promo.value.toString());
            setCity(promo.city || '');
            setMaxUses(promo.max_uses ? promo.max_uses.toString() : '');
            setExpiresAt(promo.expires_at ? promo.expires_at.split('T')[0] : '');
            setIsActive(promo.is_active);
        } else {
            setEditingPromo(null);
            setCode('');
            setType('percentage');
            setValue('');
            setCity('');
            setMaxUses('');
            setExpiresAt('');
            setIsActive(true);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPromo(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const payload = {
            code,
            type,
            value: parseFloat(value),
            city: city || null,
            max_uses: maxUses ? parseInt(maxUses) : null,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
            is_active: isActive
        };

        try {
            if (editingPromo) {
                await api.put(`/api/admin/promo-codes/${editingPromo.id}`, payload);
            } else {
                await api.post('/api/admin/promo-codes', payload);
            }
            fetchPromoCodes();
            closeModal();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Voulez-vous vraiment supprimer ce code promo ?')) return;
        try {
            await api.delete(`/api/admin/promo-codes/${id}`);
            fetchPromoCodes();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erreur lors de la suppression');
        }
    };

    if (loading && promoCodes.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Codes Promos (Réductions)</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-marine font-bold hover:bg-primary/90"
                >
                    <Plus className="h-5 w-5" />
                    <span>Nouveau Code Promo</span>
                </button>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 text-red-600">
                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Code
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Valeur
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Utilisations
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Expiration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Statut
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {promoCodes.map((promo) => (
                            <tr key={promo.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center">
                                        <Tag className="mr-2 h-5 w-5 text-gray-400" />
                                        <span className="font-semibold text-gray-900 uppercase">
                                            {promo.code}
                                        </span>
                                    </div>
                                    {promo.city && (
                                        <div className="text-xs text-gray-500 ml-7">
                                            Ville: {promo.city}
                                        </div>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value} F CFA`}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                        {promo.used_count} {promo.max_uses ? `/ ${promo.max_uses}` : ''}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Jamais'}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {promo.is_active ? (
                                        <span className="inline-flex items-center text-green-600">
                                            <CheckCircle className="mr-1.5 h-4 w-4" />
                                            Actif
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-red-600">
                                            <XCircle className="mr-1.5 h-4 w-4" />
                                            Inactif
                                        </span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <button
                                        onClick={() => openModal(promo)}
                                        className="mr-3 text-indigo-600 hover:text-indigo-900"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(promo.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingPromo ? 'Modifier le Code Promo' : 'Nouveau Code Promo'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Code (ex: TABASKI30)</label>
                                    <input
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 uppercase shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as 'percentage' | 'fixed_amount')}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                        >
                                            <option value="percentage">Pourcentage (%)</option>
                                            <option value="fixed_amount">Montant Fixe (F CFA)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Valeur</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Utilisations Max (Optionnel)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(e.target.value)}
                                            placeholder="Ex: 100"
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date d'Expiration (Optionnel)</label>
                                        <input
                                            type="date"
                                            value={expiresAt}
                                            onChange={(e) => setExpiresAt(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ville (Optionnel)</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="Ex: Porto-Novo"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                                        Activer le code promo
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-marine hover:bg-primary/90 focus:outline-none disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                    {editingPromo ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
