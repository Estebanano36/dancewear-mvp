'use client'

import { useRef, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageZoomProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageZoom({ src, alt, onClose }: ImageZoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale((s) => Math.min(4, Math.max(1, +(s + delta).toFixed(2))))
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  const start = (clientX: number, clientY: number) => {
    dragging.current = true
    last.current = { x: clientX, y: clientY }
  }

  const move = (clientX: number, clientY: number) => {
    if (!dragging.current) return
    const dx = clientX - last.current.x
    const dy = clientY - last.current.y
    last.current = { x: clientX, y: clientY }
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  const end = () => {
    dragging.current = false
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-transparent rounded-lg max-w-3xl w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-md bg-white/90 hover:bg-white"
        >
          <X className="w-4 h-4" />
        </button>
        <div
          ref={containerRef}
          className="w-full h-[80vh] flex items-center justify-center overflow-hidden touch-none relative"
          onMouseDown={(e) => start(e.clientX, e.clientY)}
          onMouseMove={(e) => move(e.clientX, e.clientY)}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={(e) => {
            const t = e.touches[0]
            start(t.clientX, t.clientY)
          }}
          onTouchMove={(e) => {
            const t = e.touches[0]
            move(t.clientX, t.clientY)
          }}
          onTouchEnd={end}
        >
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className="select-none pointer-events-none"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: `${origin.x}px ${origin.y}px`,
              transition: dragging.current ? 'none' : 'transform 120ms ease-out',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        </div>
        <div className="flex gap-2 justify-center mt-3">
          <Button onClick={() => setScale((s) => Math.min(4, +(s + 0.5).toFixed(2)))} size="sm">+</Button>
          <Button onClick={() => setScale(1)} size="sm">1x</Button>
          <Button onClick={() => setScale((s) => Math.max(1, +(s - 0.5).toFixed(2)))} size="sm">-</Button>
        </div>
      </div>
    </div>
  )
}
