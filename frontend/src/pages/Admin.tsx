import { useEffect, useState } from 'react'
import api from '@/api/client'
import type { User } from '@/types'
import toast from 'react-hot-toast'

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editAssign, setEditAssign] = useState<User | null>(null)
  const [selectedManagerIds, setSelectedManagerIds] = useState<number[]>([])

  const load = () => {
    api.get<User[]>('/users/').then((r) => setUsers(r.data))
    api.get<User[]>('/users/managers').then((r) => setManagers(r.data))
  }

  useEffect(load, [])

  const saveAssignment = async () => {
    if (!editAssign) return
    try {
      await api.put(`/users/${editAssign.id}/managers`, { manager_ids: selectedManagerIds })
      toast.success('Vorgesetzte aktualisiert')
      setEditAssign(null)
      load()
    } catch {
      toast.error('Fehler beim Speichern')
    }
  }

  const deleteUser = async (id: number) => {
    if (!confirm('Nutzer wirklich löschen?')) return
    try {
      await api.delete(`/users/${id}`)
      toast.success('Nutzer gelöscht')
      load()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'admin') return 'Admin'
    if (role === 'manager') return 'Vorgesetzter'
    return 'Mitarbeiter'
  }

  const roleBg = (role: string) => {
    if (role === 'admin') return 'bg-purple-100 text-purple-700'
    if (role === 'manager') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Nutzerverwaltung</h1>
          <p className="text-brand-gray mt-1">Alle Nutzer und ihre Zuordnungen</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + Nutzer anlegen
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">E-Mail</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Rolle</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{u.full_name}</td>
                <td className="px-6 py-4 text-brand-gray">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBg(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    {u.role === 'employee' && (
                      <button
                        onClick={() => { setEditAssign(u); setSelectedManagerIds([]) }}
                        className="text-xs text-brand-teal hover:underline font-medium"
                      >
                        Vorgesetzte zuweisen
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {showCreate && <CreateUserModal onClose={() => { setShowCreate(false); load() }} />}

      {/* Assign managers modal */}
      {editAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-heading font-bold">
              Vorgesetzte für {editAssign.full_name}
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {managers.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedManagerIds.includes(m.id)}
                    onChange={(e) =>
                      setSelectedManagerIds((prev) =>
                        e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id),
                      )
                    }
                    className="accent-brand-dark"
                  />
                  <span className="text-sm">{m.full_name}</span>
                  <span className="text-xs text-brand-gray">{m.email}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveAssignment} className="btn-primary">Speichern</button>
              <button onClick={() => setEditAssign(null)} className="btn-secondary">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users/', form)
      toast.success('Nutzer angelegt')
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Fehler'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-heading font-bold mb-4">Neuen Nutzer anlegen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">Name</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">E-Mail</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">Passwort</label>
            <input type="password" className="input" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1">Rolle</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
              <option value="employee">Mitarbeiter</option>
              <option value="manager">Vorgesetzter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Wird angelegt …' : 'Anlegen'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
          </div>
        </form>
      </div>
    </div>
  )
}
