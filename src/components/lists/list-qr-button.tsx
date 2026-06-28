'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QRModal } from '@/components/qr/qr-modal'
import type { List } from '@/types'

interface Props {
  list: List
}

export function ListQRButton({ list }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Ver QR de lista
      </Button>
      {open && <QRModal list={list} onClose={() => setOpen(false)} />}
    </>
  )
}
