'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Search, Bike, Phone, MapPin, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { createDomiciliarioAction } from '@/app/operador/domiciliarios/actions'
import type { Profile } from '@/lib/types'

interface DomiciliariosListClientProps {
  domiciliarios: Profile[]
}

const EMPTY_FORM = { full_name: '', email: '', phone: '', city: 'Bogotá' }

export function DomiciliariosListClient({ domiciliarios }: DomiciliariosListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  const filtered = domiciliarios.filter((d) => {
    const term = search.toLowerCase()
    return (
      (d.full_name ?? '').toLowerCase().includes(term) ||
      (d.email ?? '').toLowerCase().includes(term) ||
      (d.phone ?? '').toLowerCase().includes(term)
    )
  })

  const activos = domiciliarios.filter(d => d.is_active).length
  const inactivos = domiciliarios.filter(d => !d.is_active).length

  const handleCreate = () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    startTransition(async () => {
      const result = await createDomiciliarioAction(form)
      if (result.ok) {
        toast.success('Domiciliario creado. Recibirá un email para activar su cuenta.')
        setDialogOpen(false)
        setForm(EMPTY_FORM)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Domiciliarios</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{domiciliarios.length} en total</span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />{activos} activos
            </span>
            {inactivos > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <XCircle className="h-3.5 w-3.5" />{inactivos} inactivos
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Domiciliario
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bike className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{search ? 'No se encontraron domiciliarios' : 'No hay domiciliarios registrados aún'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((dom) => (
            <Card
              key={dom.id}
              className={`cursor-pointer hover:shadow-md hover:border-primary/20 transition-all ${!dom.is_active ? 'opacity-60' : ''}`}
              onClick={() => router.push(`/operador/domiciliarios/${dom.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dom.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Bike className={`h-5 w-5 ${dom.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{dom.full_name ?? 'Sin nombre'}</p>
                        <Badge
                          variant={dom.is_active ? 'default' : 'secondary'}
                          className={dom.is_active ? 'bg-green-100 text-green-800' : ''}
                        >
                          {dom.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{dom.email}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        {dom.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{dom.phone}
                          </span>
                        )}
                        {dom.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{dom.city}
                          </span>
                        )}
                        <span>Desde {format(new Date(dom.created_at), 'MMM yyyy', { locale: es })}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Domiciliario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="d-name">Nombre completo *</Label>
              <Input
                id="d-name"
                placeholder="Juan Pérez"
                value={form.full_name}
                onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-email">Email *</Label>
              <Input
                id="d-email"
                type="email"
                placeholder="juan@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="d-phone">Teléfono</Label>
                <Input
                  id="d-phone"
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-city">Ciudad</Label>
                <Input
                  id="d-city"
                  placeholder="Bogotá"
                  value={form.city}
                  onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              El domiciliario recibirá un email para activar su cuenta y acceder a la app de domiciliarios.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
                : 'Crear Domiciliario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
