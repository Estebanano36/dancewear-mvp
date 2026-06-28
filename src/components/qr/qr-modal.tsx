'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getQRUrl } from '@/utils'
import type { List } from '@/types'

interface QRModalProps {
  list: List
  onClose: () => void
}

export function QRModal({ list, onClose }: QRModalProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const qrUrl = getQRUrl(list.id)

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 300
      canvas.height = 300
      ctx?.fillRect(0, 0, 300, 300)
      ctx?.drawImage(img, 0, 0, 300, 300)
      const a = document.createElement('a')
      const namePart = list.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()
      a.download = `qr-${namePart}.png`
      a.href = canvas.toDataURL()
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <h3 className="font-bold text-gray-900 text-lg">{list ? list.name : costume?.name}</h3>
          {list ? (
            <p className="text-sm text-gray-400">Lista · {list.id}</p>
          ) : (
            <p className="text-sm text-gray-400">{costume?.code}</p>
          )}
        </div>

        <div ref={qrRef} className="flex justify-center p-4 bg-gray-50 rounded-xl mb-4">
          <QRCode value={qrUrl} size={200} />
        </div>

        <p className="text-center text-xs text-gray-400 mb-4 break-all">{qrUrl}</p>

        <Button onClick={handleDownload} className="w-full" variant="outline">
          <Download className="w-4 h-4" />
          Descargar QR
        </Button>
      </div>
    </div>
  )
}
