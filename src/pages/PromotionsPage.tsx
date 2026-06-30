import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import {
    Plus,
    Trash2,
    Edit2,
    CheckCircle,
    XCircle,
    Link as LinkIcon,
    Loader2,
    Image as ImageIcon,
    ExternalLink
} from 'lucide-react';

import { getStoragePublicUrl } from '@/utils/storagePublicUrl';

interface Promotion {
    id: number;
    title: string;
    description: string | null;
    image_url: string;
    link_url: string | null;
    is_active: boolean;
    created_at: string;
}

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/promotions');
            setPromotions(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erreur lors du chargement des promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const openModal = (promotion: Promotion | null = null) => {
        if (promotion) {
            setEditingPromotion(promotion);
            setTitle(promotion.title);
            setDescription(promotion.description || '');
            setLinkUrl(promotion.link_url || '');
            setIsActive(promotion.is_active);
        } else {
            setEditingPromotion(null);
            setTitle('');
            setDescription('');
            setLinkUrl('');
            setIsActive(true);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPromotion(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('link_url', linkUrl);
        formData.append('is_active', isActive ? '1' : '0');
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            if (editingPromotion) {
                await api.post(`/api/admin/promotions/${editingPromotion.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/api/admin/promotions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            await fetchPromotions();
            closeModal();
        } catch (err: any) {
            const apiMessage = err?.response?.data?.message;
            const apiError = err?.response?.data?.error;
            const validationErrors = err?.response?.data?.errors;
            if (validationErrors && typeof validationErrors === 'object') {
                const first = Object.values(validationErrors)?.[0];
                const firstMsg = Array.isArray(first) ? first[0] : null;
                setError(firstMsg || apiMessage || 'Erreur de validation');
            } else {
                setError(apiError || apiMessage || 'Erreur lors de la sauvegarde');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) return;
        try {
            await api.delete(`/api/admin/promotions/${id}`);
            setPromotions(promotions.filter(p => p.id !== id));
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Erreur lors de la suppression');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Promotions</h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez les bannières publicitaires affichées dans l'application.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <Plus size={18} />
                    Nouvelle Promotion
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <XCircle size={20} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promotions.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="relative aspect-video bg-gray-100">
                            <img
                                src={getStoragePublicUrl(p.image_url) || p.image_url}
                                alt={p.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                                <button
                                    onClick={() => openModal(p)}
                                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-md shadow-sm transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="p-1.5 bg-red-50/90 hover:bg-red-50 text-red-600 rounded-md shadow-sm transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {p.is_active ? 'ACTIF' : 'INACTIF'}
                            </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{p.description || 'Aucune description'}</p>
                            {p.link_url && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline">
                                    <LinkIcon size={14} />
                                    <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="truncate uppercase font-bold tracking-wider">
                                        Lien Promo
                                    </a>
                                    <ExternalLink size={12} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingPromotion ? 'Modifier la Promotion' : 'Nouvelle Promotion'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Titre</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    placeholder="Ex: -50% sur votre première course"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    rows={3}
                                    placeholder="Détails de l'offre..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Image (PNG, JPG - Max 2MB)</label>
                                <div className="mt-1 flex items-center gap-4">
                                    <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            required={!editingPromotion}
                                        />
                                        <ImageIcon size={24} />
                                        <span className="text-xs mt-1">{imageFile ? imageFile.name : 'Choisir une image'}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lien (URL)</label>
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Rendre cette promotion active immédiatement</label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : null}
                                    {editingPromotion ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
