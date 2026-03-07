'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  MapPin, 
  Phone, 
  QrCode, 
  Navigation, 
  CheckCircle2, 
  Scale,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABELS, type Order, type OrderStatus } from '@/lib/types'

interface TaskCardProps {
  order: Order
  type: 'pickup' | 'delivery'
  onUpdate?: () => void
}

export function TaskCard({ order, type, onUpdate }: TaskCardProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [weight, setWeight] = useState('')

  const isPickup = type === 'pickup'
  const address = isPickup ? order.pickup_address : (order.delivery_address || order.pickup_address)

  const handleNavigate = () => {
    const lat = isPickup ? order.pickup_lat : order.delivery_lat
    const lng = isPickup ? order.pickup_lng : order.delivery_lng
    
    if (lat && lng) {
      // Open in Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
    } else {
      // Open with address
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
    }
  }

  const handlePickup = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Ingresa el peso de la bolsa')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'recogido' as OrderStatus,
          weight_kg: parseFloat(weight),
          delivery_person_id: user?.id,
          pickup_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      // Add history
      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'recogido',
        notes: `Recogido por domiciliario. Peso: ${weight} kg`,
        changed_by: user?.id,
      })

      toast.success('Recogida completada')
      onUpdate?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al procesar la recogida')
    } finally {
      setLoading(false)
    }
  }

  const handleDeliver = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'entregado' as OrderStatus,
          actual_delivery: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      // Add history
      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'entregado',
        notes: 'Entregado al cliente por domiciliario',
        changed_by: user?.id,
      })

      toast.success('Entrega completada')
      onUpdate?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al procesar la entrega')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkInRoute = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'en_ruta_entrega' as OrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (error) throw error

      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'en_ruta_entrega',
        notes: 'Domiciliario en camino para entregar',
        changed_by: user?.id,
      })

      toast.success('Marcado como en ruta')
      onUpdate?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className={isPickup ? 'border-primary text-primary' : 'border-green-500 text-green-600'}
                >
                  {isPickup ? 'Recogida' : 'Entrega'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-2">
                <QrCode className="h-4 w-4" />
                {order.qr_code}
              </div>

              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="line-clamp-2">{address}</span>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleNavigate}
            >
              <Navigation className="mr-2 h-4 w-4" />
              Navegar
            </Button>
            {order.client?.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${order.client?.phone}`, '_self')}
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Order info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <p className="font-medium">{STATUS_LABELS[order.status]}</p>
                </div>
                {order.weight_kg && (
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <p className="font-medium">{order.weight_kg} kg</p>
                  </div>
                )}
              </div>

              {/* Pickup action */}
              {isPickup && order.status === 'pendiente' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`weight-${order.id}`} className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Peso de la bolsa (kg)
                    </Label>
                    <Input
                      id={`weight-${order.id}`}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ej: 3.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handlePickup}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Confirmar Recogida
                  </Button>
                </div>
              )}

              {/* Delivery actions */}
              {!isPickup && (
                <div className="space-y-2">
                  {order.status === 'listo' && (
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={handleMarkInRoute}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="mr-2 h-4 w-4" />
                      )}
                      Iniciar Ruta de Entrega
                    </Button>
                  )}
                  
                  {(order.status === 'listo' || order.status === 'en_ruta_entrega') && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleDeliver}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}
