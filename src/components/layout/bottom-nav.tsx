'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Shirt,
  Calendar,
  Layers,
  QrCode,
} from 'lucide-react'
import { cn } from '@/utils'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [quickCodeOpen, setQuickCodeOpen] = useState(false)
  const [codeOrId, setCodeOrId] = useState('')

  // Do not show on auth pages or QR full screen
  if (pathname === '/login' || pathname.startsWith('/qr/')) {
    return null
  }

  const handleQuickAction = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = codeOrId.trim()
    if (trimmed) {
      setQuickCodeOpen(false)
      setCodeOrId('')
      // If full URL is pasted, extract the last segment
      if (trimmed.includes('/qr/')) {
        const parts = trimmed.split('/qr/')
        router.push(`/qr/${parts[parts.length - 1]}`)
      } else {
        router.push(`/qr/${trimmed}`)
      }
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/inventory', label: 'Inventario', icon: Shirt },
    { isAction: true, label: 'Escanear', icon: QrCode },
    { href: '/lists', label: 'Listas', icon: Layers },
    { href: '/events', label: 'Eventos', icon: Calendar },
  ]

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-pb">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item, idx) => {
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  onClick={() => setQuickCodeOpen(true)}
                  className="flex flex-col items-center -mt-5 focus:outline-none group"
                  aria-label="Escanear o ingresar código"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 group-active:scale-95 transition-transform duration-150 ring-4 ring-white">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-semibold text-violet-700 mt-1">Escanear</span>
                </button>
              )
            }

            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))
            const Icon = item.icon!

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150',
                  isActive
                    ? 'text-violet-700 font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <div className={cn(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'bg-violet-100/70 text-violet-700' : 'text-gray-500'
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick QR / Code Lookup Modal */}
      <Dialog open={quickCodeOpen} onOpenChange={setQuickCodeOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-violet-200">
              <QrCode className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">Escanear o Ingresar Código</DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500">
              Ingresa el código o ID del vestuario o lista para registrar retiros, devoluciones, lavado o daños.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAction} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Input
                placeholder="Ej. VEST-001 o pega el enlace / ID..."
                value={codeOrId}
                onChange={(e) => setCodeOrId(e.target.value)}
                className="h-12 text-base text-center font-medium rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickCodeOpen(false)}
                className="flex-1 h-11 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!codeOrId.trim()}
                className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md shadow-violet-200"
              >
                Continuar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
