'use client'

import { useState, useEffect } from 'react'
import { Upload, X, Download, AlertTriangle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { costumeService } from '@/lib/services/costume.service'
import { listService } from '@/lib/services/list.service'
import { COSTUME_CATEGORIES, COSTUME_SIZES, List, Costume } from '@/types'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onSuccess: () => void
  onClose: () => void
}

interface ParsedItem {
  name: string
  category: string
  size: string
  description: string
  location: string
  notes: string
  quantity: number
  rowNumber: number
  isValid: boolean
  errors: string[]
}

export function BulkUploadModal({ onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [lists, setLists] = useState<List[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [importSummary, setImportSummary] = useState({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    totalItemsToCreate: 0,
  })

  // Load lists for the dropdown
  useEffect(() => {
    const loadLists = async () => {
      try {
        const allLists = await listService.getAll()
        setLists(allLists)
      } catch {
        // ignore
      }
    }
    loadLists()
  }, [])

  // Header mapping for Spanish and English terms
  const headerMapping: Record<string, keyof Omit<ParsedItem, 'rowNumber' | 'isValid' | 'errors'>> = {
    nombre: 'name',
    name: 'name',
    vestuario: 'name',
    categoría: 'category',
    categoria: 'category',
    category: 'category',
    tipo: 'category',
    talla: 'size',
    size: 'size',
    medida: 'size',
    descripción: 'description',
    descripcion: 'description',
    description: 'description',
    detalle: 'description',
    ubicación: 'location',
    ubicacion: 'location',
    location: 'location',
    estante: 'location',
    notas: 'notes',
    notes: 'notes',
    observaciones: 'notes',
    cantidad: 'quantity',
    quantity: 'quantity',
    stock: 'quantity',
    unidades: 'quantity',
  }

  // Parse CSV function
  const parseCSVText = (text: string): string[][] => {
    const lines: string[][] = []
    const rawLines = text.split(/\r?\n/)
    if (rawLines.length === 0) return []

    // Detect delimiter: check first line for count of ',' vs ';'
    const firstLine = rawLines[0]
    const commas = (firstLine.match(/,/g) || []).length
    const semicolons = (firstLine.match(/;/g) || []).length
    const delimiter = semicolons > commas ? ';' : ','

    for (const line of rawLines) {
      if (!line.trim()) continue
      const row: string[] = []
      let inQuotes = false
      let currentField = ''

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delimiter && !inQuotes) {
          row.push(currentField.trim())
          currentField = ''
        } else {
          currentField += char
        }
      }
      row.push(currentField.trim())

      // Clean up surrounding quotes and unescape double quotes
      const cleanedRow = row.map(field => {
        let f = field
        if (f.startsWith('"') && f.endsWith('"')) {
          f = f.slice(1, -1)
        }
        return f.replace(/""/g, '"')
      })

      lines.push(cleanedRow)
    }
    return lines
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = (fileToProcess: File) => {
    setFile(fileToProcess)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) {
        toast.error('El archivo está vacío o no se puede leer')
        return
      }

      try {
        const rows = parseCSVText(text)
        if (rows.length < 2) {
          toast.error('El archivo debe contener una fila de cabecera y al menos una fila de datos')
          setFile(null)
          return
        }

        const headers = rows[0].map(h => h.toLowerCase().trim().replace(/["']/g, ''))
        const items: ParsedItem[] = []

        let validCount = 0
        let invalidCount = 0
        let totalItems = 0

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          // Skip empty rows
          if (row.length === 1 && row[0] === '') continue

          const item: Partial<ParsedItem> = {
            name: '',
            category: '',
            size: '',
            description: '',
            location: '',
            notes: '',
            quantity: 1,
            rowNumber: i + 1,
            errors: [],
          }

          // Map CSV headers to item properties
          headers.forEach((header, colIndex) => {
            const field = headerMapping[header]
            if (field && colIndex < row.length) {
              const val = row[colIndex]
              if (field === 'quantity') {
                const q = parseInt(val, 10)
                item.quantity = isNaN(q) || q < 1 ? 1 : q
              } else {
                item[field] = val as string
              }
            }
          })

          // Apply defaults if not mapped
          item.name = item.name || ''
          item.category = item.category || ''
          item.size = item.size || ''
          item.description = item.description || ''
          item.location = item.location || ''
          item.notes = item.notes || ''
          item.quantity = item.quantity || 1

          const errors: string[] = []

          // Validation
          if (!item.name.trim()) {
            errors.push('El nombre es obligatorio')
          }

          // Category Validation & Normalization
          const categoryInput = item.category.trim()
          if (!categoryInput) {
            errors.push('La categoría es obligatoria')
          } else {
            // Case-insensitive match
            const matchedCategory = COSTUME_CATEGORIES.find(
              c => c.toLowerCase() === categoryInput.toLowerCase()
            )
            if (matchedCategory) {
              item.category = matchedCategory
            } else {
              errors.push(`Categoría inválida: "${categoryInput}". Opciones: ${COSTUME_CATEGORIES.join(', ')}`)
            }
          }

          // Size Validation & Normalization
          const sizeInput = item.size.trim()
          if (!sizeInput) {
            errors.push('La talla es obligatoria')
          } else {
            // Check sizes case-insensitively or standard normalizing
            let matchedSize = COSTUME_SIZES.find(
              s => s.toLowerCase() === sizeInput.toLowerCase()
            )
            // Normalize "unico" to "Único"
            if (!matchedSize && (sizeInput.toLowerCase() === 'unico' || sizeInput.toLowerCase() === 'único')) {
              matchedSize = 'Único'
            }

            if (matchedSize) {
              item.size = matchedSize
            } else {
              errors.push(`Talla inválida: "${sizeInput}". Opciones: ${COSTUME_SIZES.join(', ')}`)
            }
          }

          const isValid = errors.length === 0
          item.isValid = isValid
          item.errors = errors

          if (isValid) {
            validCount++
            totalItems += item.quantity!
          } else {
            invalidCount++
          }

          items.push(item as ParsedItem)
        }

        setParsedItems(items)
        setImportSummary({
          totalRows: rows.length - 1,
          validRows: validCount,
          invalidRows: invalidCount,
          totalItemsToCreate: totalItems,
        })
      } catch (e) {
        console.error(e)
        toast.error('Error al procesar el archivo CSV. Asegúrate de que tenga el formato adecuado.')
        setFile(null)
      }
    }
    reader.readAsText(fileToProcess, 'UTF-8')
  }

  const downloadTemplate = () => {
    const csvContent = "\uFEFFNombre,Categoría,Talla,Descripción,Ubicación,Notas,Cantidad\n" +
      "Vestido Flamenco Rojo,Vestido,M,Vestido rojo con volantes y bordados dorados,Estante A-1,Con detalles de uso,3\n" +
      "Falda de Tango Negra,Falda,S,Falda de seda con apertura lateral,Estante A-2,,2\n" +
      "Tocado de Flores Artificiales,Tocado,Único,Corona de flores rojas y amarillas,Caja Accesorios 1,,5\n" +
      "Zapatos de Flamenco Profesional,Calzado,M,Zapatos con clavos en puntera y tacón,Estante Calzado 3,Talla aproximada 37,1"

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'plantilla_vestuarios.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    const validItems = parsedItems.filter(item => item.isValid)
    if (validItems.length === 0) {
      toast.error('No hay registros válidos para importar')
      return
    }

    try {
      setLoading(true)

      // Unroll quantities to separate costume objects
      const costumesToInsert: Omit<Costume, 'id' | 'created_at' | 'updated_at' | 'code' | 'qr_token'>[] = []
      validItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          costumesToInsert.push({
            name: item.name,
            category: item.category,
            size: item.size,
            description: item.description || undefined,
            location: item.location || undefined,
            notes: item.notes || undefined,
            status: 'available',
            photos: [],
          })
        }
      })

      // Insert all costumes in one call
      const createdCostumes = await costumeService.createMany(costumesToInsert)

      // If a list was selected, link costumes to that list
      if (selectedListId && createdCostumes.length > 0) {
        const supabase = createClient()
        
        // Prepare list items. Since each physical dress has a separate record in costumes, 
        // they are individual items in the list with stock = 1.
        const listItemsPayload = createdCostumes.map(costume => ({
          list_id: selectedListId,
          costume_id: costume.id,
          stock: 1
        }))

        const { error: listInsertError } = await supabase
          .from('list_items')
          .insert(listItemsPayload)

        if (listInsertError) {
          console.error('Error al agregar items a la lista:', listInsertError)
          toast.warning(`Vestuarios creados, pero hubo un error al agregarlos a la lista: ${listInsertError.message}`)
        } else {
          toast.success(`${createdCostumes.length} vestuarios creados y agregados a la lista exitosamente`)
        }
      } else {
        toast.success(`${createdCostumes.length} vestuarios creados exitosamente en el inventario`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al importar:', err)
      toast.error(err instanceof Error ? err.message : 'Error al importar los vestuarios')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>Carga masiva de vestuarios</span>
          </DialogTitle>
        </DialogHeader>

        {!file ? (
          <div className="space-y-5 py-2">
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Sube un archivo en formato **CSV** para importar múltiples vestuarios de golpe.
                Es ideal para inventarios grandes y te ahorrará registrar prenda por prenda.
              </p>
              <div className="bg-violet-50 text-violet-800 rounded-xl p-3.5 border border-violet-100 flex gap-2.5 items-start text-xs">
                <HelpCircle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">Estructura del archivo CSV:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Cabeceras permitidas:</strong> Nombre, Categoría, Talla, Descripción, Ubicación, Notas, Cantidad.</li>
                    <li><strong>Categorías válidas:</strong> {COSTUME_CATEGORIES.join(', ')}.</li>
                    <li><strong>Tallas válidas:</strong> {COSTUME_SIZES.join(', ')}.</li>
                    <li>Si pones <strong>Cantidad &gt; 1</strong>, el sistema generará automáticamente esa cantidad de vestidos idénticos con códigos QR únicos.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                <Download className="w-4 h-4" />
                Descargar plantilla CSV
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="csv-list">Agregar a lista (opcional)</Label>
                <Select value={selectedListId ?? 'none'} onValueChange={(v) => setSelectedListId(v === 'none' ? null : v)}>
                  <SelectTrigger id="csv-list" className="mt-1.5">
                    <SelectValue placeholder="Seleccionar lista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna (Solo agregar a inventario)</SelectItem>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Seleccionar archivo CSV</Label>
                <div className="mt-1.5">
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/50 transition-all duration-200">
                    <Upload className="w-8 h-8 text-gray-400 mb-2 animate-bounce" />
                    <span className="text-sm font-medium text-gray-700">Arrastra tu archivo aquí o haz clic para buscar</span>
                    <span className="text-xs text-gray-400 mt-1">Soporta archivos .csv UTF-8</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* File info */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm">
                  CSV
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm max-w-[280px] truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => { setFile(null); setParsedItems([]); }} disabled={loading}>
                <X className="w-4 h-4 text-gray-500" />
              </Button>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-3.5 flex gap-2 items-start">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Prendas válidas</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{importSummary.validRows} filas</p>
                  <p className="text-[10px] text-emerald-600/90 font-medium mt-0.5">({importSummary.totalItemsToCreate} copias físicas totales)</p>
                </div>
              </div>
              <div className={`rounded-2xl p-3.5 flex gap-2 items-start ${importSummary.invalidRows > 0 ? 'bg-red-50/50 border border-red-100/80' : 'bg-gray-50 border border-gray-100'}`}>
                <AlertTriangle className={`w-4.5 h-4.5 flex-shrink-0 mt-0.5 ${importSummary.invalidRows > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Filas con error</p>
                  <p className={`text-lg font-black mt-0.5 ${importSummary.invalidRows > 0 ? 'text-red-700' : 'text-gray-600'}`}>{importSummary.invalidRows} filas</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">No serán importadas</p>
                </div>
              </div>
            </div>

            {/* Selected List Badge */}
            {selectedListId && (
              <div className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 rounded-xl text-xs flex items-center justify-between">
                <span>Destino: Agregando los vestuarios a la lista <strong>{lists.find(l => l.id === selectedListId)?.name}</strong></span>
                <button type="button" onClick={() => setSelectedListId(null)} className="text-blue-500 hover:text-blue-700 font-bold">Quitar</button>
              </div>
            )}

            {/* Preview section */}
            <div>
              <Label className="text-gray-700">Previsualización (Primeros registros)</Label>
              <div className="mt-1.5 border border-gray-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium">
                      <th className="p-2.5">Fila</th>
                      <th className="p-2.5">Nombre</th>
                      <th className="p-2.5">Categoría</th>
                      <th className="p-2.5">Talla</th>
                      <th className="p-2.5">Cant.</th>
                      <th className="p-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className={`border-b border-gray-50/50 hover:bg-gray-50/40 transition-colors ${!item.isValid ? 'bg-red-50/20' : ''}`}>
                        <td className="p-2.5 text-gray-400 font-mono">{item.rowNumber}</td>
                        <td className="p-2.5 font-semibold text-gray-800 truncate max-w-[120px]">{item.name || '—'}</td>
                        <td className="p-2.5 text-gray-600">{item.category || '—'}</td>
                        <td className="p-2.5 font-mono text-gray-600">{item.size || '—'}</td>
                        <td className="p-2.5 font-mono text-gray-600">{item.quantity}</td>
                        <td className="p-2.5">
                          {item.isValid ? (
                            <span className="text-emerald-600 font-medium flex items-center gap-1">✓ Listo</span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1" title={item.errors.join(', ')}>
                              ✗ Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Errors list */}
            {importSummary.invalidRows > 0 && (
              <div className="space-y-1.5">
                <Label className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Detalle de errores de validación
                </Label>
                <div className="bg-red-50/30 border border-red-100 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1 text-xs text-red-700 font-medium">
                  {parsedItems.filter(item => !item.isValid).map((item, idx) => (
                    <div key={idx} className="flex gap-1.5 items-start">
                      <span className="font-mono text-red-500 flex-shrink-0">Fila {item.rowNumber}:</span>
                      <span>{item.errors.join(' | ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>

          {file && (
            <Button
              onClick={handleImport}
              loading={loading}
              disabled={importSummary.validRows === 0 || loading}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Importando...
                </>
              ) : (
                `Importar ${importSummary.validRows} fila(s)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
