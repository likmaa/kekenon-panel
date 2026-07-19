import React, { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { getStoragePublicUrl } from '@/utils/storagePublicUrl'
import { X, Pencil } from 'lucide-react'

type User = {
  id: number
  name: string
  email: string | null
  phone: string | null
  role: 'admin' | 'developer' | 'driver' | 'passenger'
  is_active?: boolean | null
  photo: string | null
}

type Paged<T> = {
  data: T[]
  current_page: number
  per_page: number
  total: number
}

export default function UsersManagementPage() {
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paged, setPaged] = useState<Paged<User>>({ data: [], current_page: 1, per_page: 20, total: 0 })
  const { user: currentUser } = useAuth()

  // Creation State
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit State
  const [showEdit, setShowEdit] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editData, setEditData] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' })
  const [editLoading, setEditLoading] = useState(false)

  const roles = useMemo(() => ['admin', 'developer', 'driver', 'passenger'], [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = { page }
      if (roleFilter) params.role = roleFilter
      if (q) params.q = q
      const r = await api.get<Paged<User>>('/api/admin/users', { params })
      setPaged(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const onSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const updateRole = async (u: User, newRole: User['role']) => {
    try {
      await api.patch(`/api/admin/users/${u.id}`, { role: newRole })
      setPaged((old) => ({
        ...old,
        data: old.data.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)),
      }))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Impossible de mettre à jour le rôle')
    }
  }

  const deleteUser = async (u: User) => {
    const meStr = localStorage.getItem('admin_user')
    const me = meStr ? (JSON.parse(meStr) as { id: number }) : null
    if (me && me.id === u.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte.")
      return
    }
    if (!confirm(`Supprimer l'utilisateur #${u.id} (${u.name}) ?`)) return
    try {
      await api.delete(`/api/admin/users/${u.id}`)
      setPaged((old) => ({
        ...old,
        data: old.data.filter((x) => x.id !== u.id),
        total: Math.max(0, old.total - 1),
      }))
    } catch (e: any) {
      alert(e?.response?.data?.message || "Suppression impossible")
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      await api.post('/api/admin/users', createData)
      setShowCreate(false)
      setCreateData({ name: '', email: '', phone: '', password: '', role: 'admin' })
      fetchUsers() // Refresh list
      alert("Utilisateur créé !")
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur de création")
    } finally {
      setCreateLoading(false)
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditData({
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      password: '', // Leave empty, only update if filled
      role: u.role,
    })
    setShowEdit(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditLoading(true)
    try {
      const payload: any = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        role: editData.role,
      }
      // Only include password if it's filled
      if (editData.password.trim()) {
        payload.password = editData.password
      }
      await api.patch(`/api/admin/users/${editUser.id}`, payload)
      setShowEdit(false)
      setEditUser(null)
      fetchUsers() // Refresh list
      alert("Utilisateur modifié !")
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur de modification")
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Utilisateurs</h2>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher nom / email / téléphone"
            className="px-3 py-2 border rounded-md text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">Tous les rôles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={onSearch}
            className="px-3 py-2 bg-primary text-marine rounded-md text-sm font-bold"
            disabled={loading}
          >
            Rechercher
          </button>
        </div>

        {currentUser?.role === 'developer' && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            + Nouveau Admin
          </button>
        )}
      </div>

      {error ? <div className="text-red-600 text-sm">{error}</div> : null}

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              <th className="text-left px-4 py-2 w-10">Photo</th>
              <th className="text-left px-4 py-2">Nom</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Téléphone</th>
              <th className="text-left px-4 py-2">Rôle</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.data.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.id}</td>
                <td className="px-4 py-2">
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                    {u.photo ? (
                      <img
                        src={getStoragePublicUrl(u.photo) || ''}
                        alt={u.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary text-marine text-[10px] font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 font-medium">{u.name}</td>
                <td className="px-4 py-2">{u.email || '-'}</td>
                <td className="px-4 py-2">{u.phone || '-'}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u, e.target.value as User['role'])}
                    className="px-2 py-1 border rounded-md"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  {currentUser?.role === 'developer' && (
                    <button
                      onClick={() => openEdit(u)}
                      className="px-2 py-1 text-white bg-amber-500 hover:bg-amber-600 rounded-md text-xs flex items-center gap-1"
                    >
                      <Pencil size={12} />
                      Modifier
                    </button>
                  )}
                  <button
                    onClick={() => deleteUser(u)}
                    className="px-2 py-1 text-white bg-red-500 hover:bg-red-600 rounded-md text-xs"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {!loading && paged.data.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Aucun utilisateur</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 border rounded-md"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Précédent
        </button>
        <div className="text-sm text-gray-600">Page {paged.current_page}</div>
        <button
          className="px-3 py-2 border rounded-md"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || paged.data.length < paged.per_page}
        >
          Suivant
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Créer un nouvel utilisateur</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  required
                  className="w-full border rounded p-2"
                  value={createData.name}
                  onChange={e => setCreateData({ ...createData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full border rounded p-2"
                  value={createData.email}
                  onChange={e => setCreateData({ ...createData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  required
                  className="w-full border rounded p-2"
                  value={createData.phone}
                  onChange={e => setCreateData({ ...createData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mot de passe</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="w-full border rounded p-2"
                  value={createData.password}
                  onChange={e => setCreateData({ ...createData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select
                  className="w-full border rounded p-2"
                  value={createData.role}
                  onChange={e => setCreateData({ ...createData, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Développeur</option>
                  <option value="driver">Zem</option>
                  <option value="passenger">Passager</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {createLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => { setShowEdit(false); setEditUser(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-4">Modifier l'utilisateur #{editUser.id}</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  required
                  className="w-full border rounded p-2"
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full border rounded p-2"
                  value={editData.email}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  required
                  className="w-full border rounded p-2"
                  value={editData.phone}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nouveau mot de passe <span className="text-gray-400 text-xs">(laisser vide pour ne pas changer)</span></label>
                <input
                  type="password"
                  minLength={8}
                  className="w-full border rounded p-2"
                  value={editData.password}
                  onChange={e => setEditData({ ...editData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rôle</label>
                <select
                  className="w-full border rounded p-2"
                  value={editData.role}
                  onChange={e => setEditData({ ...editData, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="developer">Développeur</option>
                  <option value="driver">Zem</option>
                  <option value="passenger">Passager</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEdit(false); setEditUser(null); }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                >
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
