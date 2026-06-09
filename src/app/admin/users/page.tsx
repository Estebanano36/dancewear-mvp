 'use client'

import { useEffect, useState } from 'react'
import { authService } from '@/lib/services/auth.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await authService.getUsers()
      setUsers(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error')
      toast.success('Rol actualizado')
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona roles de usuario</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">Cargando...</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Sin usuarios</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{u.full_name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="w-44">
                  <Select value={u.role} onValueChange={(v) => handleChangeRole(u.id, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dancer">Bailarín</SelectItem>
                      <SelectItem value="coordinator">Coordinador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
