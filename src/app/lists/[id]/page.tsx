import { listService } from '@/lib/services/list.service'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { List, ListItem } from '@/types'
import { ListQRButton } from '@/components/lists/list-qr-button'

export default async function ListDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const list = await listService.getById(id)
  // render server-side with initial data
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold">{list?.name}</h1>
          <p className="text-sm text-gray-500">{list?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/lists">
            <Button variant="outline">Volver</Button>
          </Link>
          {list && <ListQRButton list={list} />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {list?.items?.map((it) => (
          <Link key={it.id} href={`/inventory/${it.costume?.id}`} className="block">
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center hover:shadow-sm transition-shadow">
              <div className="w-20 h-20 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                {it.costume?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.costume.photos[0]} alt={it.costume.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">👗</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{it.costume?.name || '—'}</div>
                <div className="text-xs text-gray-400">{it.costume?.code}</div>
                <div className="text-sm text-gray-600 mt-2">Stock: <span className="font-medium">{it.stock}</span></div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
