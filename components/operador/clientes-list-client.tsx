'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Search, User, Phone, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { createClienteAction } from '@/app/operador/clientes/actions'
import type { Profile } from '@/lib/types'

interface ClientesListClientProps {
  clientes: Profile[]
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  city: 'Bogotá',
  address: '',
  operator_notes: '',
}

export function ClientesListClient({ clientes }: ClientesListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  const filtered = clientes.filter((c) => {
    const term = search.toLowerCase()
    return (
      (c.full_name ?? '').toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term) ||
      (c.phone ?? '').toLowerCase().includes(term)
    )
  })

  const handleCreate = () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    startTransition(async () => {
      const result = await createClienteAction(form)
      if (result.ok) {
        toast.success('Cliente creado. Recibirá un email para activar su cuenta.')
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
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">{clientes.length} clientes registrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
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
            <User className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>{search ? 'No se encontraron clientes' : 'No hay clientes registrados aún'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cliente) => (
            <Card
              key={cliente.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
              onClick={() => router.push(`/operador/clientes/${cliente.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold truncate">{cliente.full_name ?? 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground truncate">{cliente.email}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        {cliente.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{cliente.phone}
                          </span>
                        )}
                        {cliente.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{cliente.city}
                          </span>
                        )}
                        <span>
                          Desde {format(new Date(cliente.created_at), "MMM yyyy", { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(cliente as any).operator_notes && (
                      <Badge variant="outline" className="text-xs hidden sm:flex">Con notas</Badge>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Nombre completo *</Label>
              <Input
                id="c-name"
                placeholder="María García"
                value={form.full_name}
                onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email *</Label>
              <Input
                id="c-email"
                type="email"
                placeholder="maria@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-phone">Teléfono</Label>
                <Input
                  id="c-phone"
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-city">Ciudad</Label>
                <Input
                  id="c-city"
                  placeholder="Bogotá"
                  value={form.city}
                  onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-address">Dirección</Label>
              <Input
                id="c-address"
                placeholder="Calle 100 #15-20"
                value={form.address}
                onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-notes">Comentarios y preferencias</Label>
              <Textarea
                id="c-notes"
                placeholder="Notas internas del operador..."
                rows={3}
                value={form.operator_notes}
                onChange={(e) => setForm(p => ({ ...p, operator_notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
                : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
