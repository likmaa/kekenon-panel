import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { ShieldCheck, UserPlus, Check, X, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Role = {
    id: number;
    name: string;
    permissions: Permission[];
};

type Permission = {
    id: number;
    name: string;
};

type StaffUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    roles: Role[];
};

export default function RolesPermissionsManager() {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Matrix state: roleId -> array of permission names
    const [rolePermissions, setRolePermissions] = useState<Record<number, string[]>>({});
    const [savingMatrix, setSavingMatrix] = useState<number | null>(null);

    // Assign role state
    const [selectedUser, setSelectedUser] = useState<number | ''>('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [assigningRole, setAssigningRole] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permsRes, staffRes] = await Promise.all([
                api.get('/api/admin/roles-permissions/roles'),
                api.get('/api/admin/roles-permissions/permissions'),
                api.get('/api/admin/roles-permissions/staff')
            ]);
            
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
            setStaff(staffRes.data);

            const initialRolePerms: Record<number, string[]> = {};
            rolesRes.data.forEach((r: Role) => {
                initialRolePerms[r.id] = r.permissions.map(p => p.name);
            });
            setRolePermissions(initialRolePerms);

        } catch (error) {
            console.error("Failed to fetch RBAC data", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (roleId: number, permissionName: string) => {
        setRolePermissions(prev => {
            const current = prev[roleId] || [];
            if (current.includes(permissionName)) {
                return { ...prev, [roleId]: current.filter(p => p !== permissionName) };
            } else {
                return { ...prev, [roleId]: [...current, permissionName] };
            }
        });
    };

    const saveRolePermissions = async (role: Role) => {
        try {
            setSavingMatrix(role.id);
            const perms = rolePermissions[role.id] || [];
            await api.post(`/api/admin/roles-permissions/roles/${role.id}/sync`, { permissions: perms });
            // Optionally show toast success
        } catch (error) {
            console.error("Failed to sync permissions", error);
        } finally {
            setSavingMatrix(null);
        }
    };

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !selectedRole) return;

        try {
            setAssigningRole(true);
            await api.post(`/api/admin/roles-permissions/users/${selectedUser}/assign`, { role: selectedRole });
            
            // Refresh staff list
            const staffRes = await api.get('/api/admin/roles-permissions/staff');
            setStaff(staffRes.data);
            
            setSelectedUser('');
            setSelectedRole('');
        } catch (error) {
            console.error("Failed to assign role", error);
        } finally {
            setAssigningRole(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Matrices des Permissions par Rôle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                    <ShieldCheck className="text-marine" size={20} />
                    <h2 className="font-semibold text-gray-900">Matrice des Permissions</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-gray-200 text-gray-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Permissions</th>
                                {roles.map(role => (
                                    <th key={role.id} className="px-4 py-3 font-medium text-center capitalize">
                                        {role.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {permissions.map(perm => (
                                <tr key={perm.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-700">
                                        {perm.name}
                                    </td>
                                    {roles.map(role => {
                                        const hasPerm = rolePermissions[role.id]?.includes(perm.name);
                                        const isSuperAdmin = role.name === 'super-admin';
                                        
                                        return (
                                            <td key={role.id} className="px-4 py-2 text-center">
                                                <button
                                                    disabled={isSuperAdmin}
                                                    onClick={() => togglePermission(role.id, perm.name)}
                                                    className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                                        hasPerm 
                                                            ? isSuperAdmin ? 'bg-primary/50 text-marine/50 cursor-not-allowed' : 'bg-primary text-marine hover:bg-primary-dark' 
                                                            : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {hasPerm && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {/* Save Row */}
                            <tr className="bg-gray-50/50">
                                <td className="px-4 py-4 text-right text-sm text-gray-500 font-medium">
                                    Sauvegarder les modifications
                                </td>
                                {roles.map(role => (
                                    <td key={role.id} className="px-4 py-3 text-center">
                                        {role.name !== 'super-admin' && (
                                            <button
                                                onClick={() => saveRolePermissions(role)}
                                                disabled={savingMatrix === role.id}
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-marine text-white text-xs font-medium hover:bg-marine/90 disabled:opacity-50"
                                            >
                                                {savingMatrix === role.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                Sauver
                                            </button>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assigner un rôle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
                    <UserPlus className="text-marine" size={20} />
                    <h2 className="font-semibold text-gray-900">Assigner un Rôle</h2>
                </div>
                
                <form onSubmit={handleAssignRole} className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Administrateur</label>
                        <select 
                            value={selectedUser} 
                            onChange={(e) => setSelectedUser(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        >
                            <option value="">Sélectionner un utilisateur</option>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.email} (Actuel: {s.roles[0]?.name || s.role})</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau Rôle</label>
                        <select 
                            value={selectedRole} 
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary capitalize"
                            required
                        >
                            <option value="">Sélectionner un rôle</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={assigningRole || !selectedUser || !selectedRole}
                        className="px-4 py-2 bg-primary text-marine rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50 min-w-[120px] flex justify-center items-center h-[38px]"
                    >
                        {assigningRole ? <Loader2 size={16} className="animate-spin" /> : 'Assigner'}
                    </button>
                </form>
            </div>
            
            {/* Liste du staff */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Équipe & Accès Actuels</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                            <tr>
                                <th className="px-5 py-3 font-medium">Nom / Email</th>
                                <th className="px-5 py-3 font-medium">Rôle (Système)</th>
                                <th className="px-5 py-3 font-medium">Rôle (RBAC)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {staff.map(s => (
                                <tr key={s.id}>
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-gray-900">{s.name || 'N/A'}</p>
                                        <p className="text-gray-500 text-xs">{s.email}</p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                                            {s.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex gap-2">
                                            {s.roles.length > 0 ? s.roles.map(r => (
                                                <span key={r.id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-marine capitalize">
                                                    {r.name}
                                                </span>
                                            )) : (
                                                <span className="text-gray-400 italic text-xs">Aucun rôle RBAC</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
