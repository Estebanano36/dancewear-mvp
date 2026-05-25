'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Shield, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/utils'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, loading } = useUser()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (user) setFullName(user.full_name)
  }, [user])

  const handleSaveProfile = async () => {
    if (!fullName.trim()) { toast.error('El nombre no puede estar vacío'); return }
    try {
      setSaving(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user!.id)
      if (error) throw error
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    try {
      setChangingPassword(true)
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Contraseña actualizada')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Administra tu perfil y cuenta</p>
      </div>

      <div className="space-y-4">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Tu información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">
                  {user?.full_name ? getInitials(user.full_name) : 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{user?.full_name}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="full-name">Nombre completo</Label>
              <Input
                id="full-name"
                className="mt-1.5"
                leftIcon={<User className="w-4 h-4" />}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                className="mt-1.5"
                leftIcon={<Mail className="w-4 h-4" />}
                value={user?.email || ''}
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar</p>
            </div>

            <div>
              <Label>Rol</Label>
              <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 capitalize">
                  {user?.role === 'coordinator' ? '📋 Coordinador/a' : '💃 Bailarín/a'}
                </span>
              </div>
            </div>

            <Button onClick={handleSaveProfile} loading={saving} className="w-full">
              <Save className="w-4 h-4" />
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                className="mt-1.5"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleChangePassword}
              loading={changingPassword}
              variant="outline"
              className="w-full"
              disabled={!newPassword}
            >
              Cambiar contraseña
            </Button>
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">🩰</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800">DanceWear MVP</p>
                <p className="text-xs text-gray-400">v1.0.0 · Gestión de vestuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
