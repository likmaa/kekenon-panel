import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/api/client';
import { getStoragePublicUrl } from '@/utils/storagePublicUrl';
import { User, Save, Mail, Phone, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import RolesPermissionsManager from '@/components/RolesPermissionsManager';

export default function ProfilePage() {
    const { user, login, token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'profile' | 'rbac'>('profile');

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [photo, setPhoto] = useState(user?.photo || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Fetch fresh user data from backend on mount
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const res = await api.get('/api/admin/me');
                const freshUser = res.data;

                // Sync with Auth Context & LocalStorage
                if (token) {
                    login(token, freshUser);
                }

                setName(freshUser.name || '');
                setEmail(freshUser.email || '');
                setPhone(freshUser.phone || '');
                setPhoto(freshUser.photo || '');
            } catch (err) {
                console.error('Failed to fetch user data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        setError('');

        try {
            const formData = new FormData();
            formData.append('_method', 'PUT'); // Laravel spoofing (important for multipart/form-data)
            formData.append('name', name);
            formData.append('email', email);
            formData.append('phone', phone);
            if (password) {
                if (password !== confirmPassword) {
                    setError('Les mots de passe ne correspondent pas.');
                    setSaving(false);
                    return;
                }
                if (password.length < 8) {
                    setError('Le mot de passe doit faire au moins 8 caractères.');
                    setSaving(false);
                    return;
                }
                formData.append('password', password);
            }
            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            // Route is /api/auth/profile (from backend routes/api.php)
            const res = await api.post('/api/auth/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const updatedUser = res.data;

            // Update local auth state + localStorage
            if (token) {
                login(token, updatedUser);
            }

            setPhoto(updatedUser.photo);
            setSelectedFile(null);
            setPreviewUrl(null);
            setPassword('');
            setConfirmPassword('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            const serverError = err?.response?.data?.error || err?.response?.data?.message;
            setError(serverError || 'Erreur lors de la mise à jour du profil.');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !user) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Chargement de vos informations...</p>
            </div>
        );
    }

    const displayAvatar = previewUrl || getStoragePublicUrl(photo);
    
    // Check if user has permission or is super-admin
    const canManageRoles = user?.roles?.includes('super-admin') || user?.permissions?.includes('manage_roles') || user?.role === 'super-admin' || user?.role === 'developer';

    return (
        <div className="max-w-4xl mx-auto text-sm sm:text-base">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez votre compte et les paramètres de la plateforme</p>
                </div>
                
                {canManageRoles && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Mon Profil
                        </button>
                        <button 
                            onClick={() => setActiveTab('rbac')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'rbac' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Rôles & Permissions
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'profile' ? (
                <>

            {/* Avatar section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg transition-all overflow-hidden ${loading ? 'opacity-50 blur-sm' : ''}`}>
                            {displayAvatar ? (
                                <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span>{name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'D'}</span>
                            )}
                        </div>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={triggerFileInput}
                            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors shadow-sm"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{loading ? 'Chargement...' : (name || email || 'Utilisateur')}</h2>
                        <div className="flex flex-col gap-1 mt-1">
                            <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                                {user?.role || 'developer'}
                            </span>
                            {selectedFile && (
                                <span className="text-xs text-primary font-medium flex items-center gap-1">
                                    <CheckCircle size={12} /> Nouvelle photo sélectionnée
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Informations du compte</h3>

                {/* Success message */}
                {success && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                        <CheckCircle size={16} />
                        <span>Profil mis à jour avec succès !</span>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nom complet
                        </label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Votre nom"
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Adresse Email
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Numéro de téléphone
                        </label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+229 XX XX XX XX"
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Sécurité</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="new-password" title="Nouveau mot de passe" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nouveau mot de passe
                                </label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Laissez vide pour ne pas changer</p>
                            </div>
                            <div>
                                <label htmlFor="confirm-password" title="Confirmer le mot de passe" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Confirmer le mot de passe
                                </label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-marine text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm min-w-[120px] justify-center font-bold"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Enregistrement...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Enregistrer</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
            </>
            ) : (
                <RolesPermissionsManager />
            )}
        </div>
    );
}
