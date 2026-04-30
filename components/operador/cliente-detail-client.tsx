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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  Shirt, Clock, CheckCircle2, Loader2, Save
} from 'lucide-react'
import { updateClienteAction } from '@/app/operador/clientes/actions'
import { STATUS_LABELS, STATUS_COLORS, formatCOP, type Order, type Profile } from '@/lib/types'

interface ClienteDetailClientProps {
  cliente: Profile & { operator_notes?: string | null }
  orders: Order[]
}

export function ClienteDetailClient({ cliente, orders }: ClienteDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    full_name: cliente.full_name ?? '',
    phone: cliente.phone ?? '',
    city: cliente.city ?? '',
    address: cliente.address ?? '',
    operator_notes: (cliente as any).operator_notes ?? '',
  })

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateClienteAction(cliente.id, form)
      if (result.ok) {
        toast.success('Cliente actualizado correctamente')
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  const activeOrders = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const pastOrders = orders.filter(o => o.status === 'entregado' || o.status === 'cancelado')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/operador/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{cliente.full_name ?? 'Sin nombre'}</h1>
          <p className="text-muted-foreground">{cliente.email}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Datos del cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (no editable) */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email (no editable)
              </Label>
              <p className="text-sm font-medium bg-muted px-3 py-2 rounded-md">{cliente.email}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-name">Nombre completo</Label>
              <Input
                id="d-name"
                value={form.full_name}
                onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="d-phone">Teléfono</Label>
                <Input
                  id="d-phone"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-city">Ciudad</Label>
                <Input
                  id="d-city"
                  value={form.city}
                  onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="d-address">Dirección</Label>
              <Input
                id="d-address"
                value={form.address}
                onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="d-notes">Comentarios y preferencias del operador</Label>
              <Textarea
                id="d-notes"
                rows={4}
                placeholder="Notas internas: preferencias especiales, alergias, instrucciones recurrentes..."
                value={form.operator_notes}
                onChange={(e) => setForm(p => ({ ...p, operator_notes: e.target.value }))}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                : <><Save className="mr-2 h-4 w-4" />Guardar Cambios</>}
            </Button>

            {/* Meta */}
            <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <Calendar className="h-3 w-3" />
              Cliente desde {format(new Date(cliente.created_at), "d 'de' MMMM, yyyy", { locale: es })}
            </div>
          </CardContent>
        </Card>

        {/* Resumen de órdenes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Total órdenes</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-blue-700">{activeOrders.length}</p>
                <p className="text-xs text-muted-foreground">Activas</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-700">{pastOrders.length}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>

            {orders.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1 pt-1">
                <p>
                  <span className="font-medium text-foreground">Primera orden: </span>
                  {format(new Date(orders[orders.length - 1].created_at), "d MMM yyyy", { locale: es })}
                </p>
                <p>
                  <span className="font-medium text-foreground">Última orden: </span>
                  {format(new Date(orders[0].created_at), "d MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de órdenes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial de Órdenes ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shirt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Este cliente no tiene órdenes aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/operador/tickets/${order.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shirt className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{order.qr_code}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{format(new Date(order.created_at), "d MMM yyyy", { locale: es })}</span>
                        {order.weight_kg && <span>{order.weight_kg} kg</span>}
                        {(order.final_price || order.estimated_price) && (
                          <span className="font-medium text-foreground">
                            {formatCOP(order.final_price || order.estimated_price || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] ?? 'bg-muted text-muted-foreground'}>
                    {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
