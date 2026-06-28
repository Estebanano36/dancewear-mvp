import React from 'react'
import Link from 'next/link'
import { listService } from '@/lib/services/list.service'
import { Button } from '@/components/ui/button'

export default async function ListsPage() {
  const lists = await listService.getAll()
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Listas</h1>
          <p className="text-sm text-gray-500">Colecciones de vestuarios</p>
        </div>
        <Link href="/inventory">
          <Button variant="outline">Ir al inventario</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((l) => (
          <Link key={l.id} href={`/lists/${l.id}`} className="block">
            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md">
              <div className="font-semibold">{l.name}</div>
              <div className="text-xs text-gray-400">{l.description}</div>
              <div className="text-xs text-gray-500 mt-2">{l.created_at}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
