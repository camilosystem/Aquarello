'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  MapPin, Phone, QrCode, Navigation, CheckCircle2, Scale, 
  Loader2, ChevronDown, ChevronUp, User, Truck, Store, RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABELS, type OrderStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface TaskCardProps {
  order: any 
  type: 'pickup' | 'delivery'
  onUpdate?: () => void
}

export function TaskCard({ order, type, onUpdate }: TaskCardProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [weight, setWeight] = useState('')

  const isPickup = type === 'pickup'
  const address = isPickup ? order.pickup_address : (order.delivery_address || order.pickup_address)
  
  const customerName = order.cliente?.full_name || 'Cliente sin nombre'
  const customerPhone = order.cliente?.phone || ''

  const handleNavigate = () => {
    const lat = isPickup ? order.pickup_lat : order.delivery_lat
    const lng = isPickup ? order.pickup_lng : order.delivery_lng
    
    if (lat && lng) {
      window.open(`http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`, '_blank')
    } else {
      window.open(`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')
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
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'recogido' as OrderStatus,
          actual_weight: parseFloat(weight),
          delivery_person_id: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      if (orderError) throw orderError

      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'recogido',
        notes: `Recogido por domiciliario. Peso: ${weight} kg`,
        changed_by: user?.id,
      })
      toast.success('Recogida completada')
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Error al procesar la recogida'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: OrderStatus, successMessage: string, historyNote: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id)

      if (orderError) throw orderError

      await supabase.from('order_history').insert({
        order_id: order.id,
        status: newStatus,
        notes: historyNote,
        changed_by: user?.id,
      })
      toast.success(successMessage)
      onUpdate?.()
    } catch (error: any) {
      toast.error('Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:border-primary/30 transition-colors">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={isPickup ? 'border-primary text-primary bg-primary/5' : 'border-green-500 text-green-600 bg-green-500/5'}>
                  {isPickup ? 'Recogida' : 'Entrega'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-1">
                <QrCode className="h-4 w-4" />
                {order.qr_code}
              </div>

              <div className="flex items-center gap-2 text-sm font-medium mb-1 text-foreground">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="line-clamp-1">{customerName}</span>
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

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleNavigate}>
              <Navigation className="mr-2 h-4 w-4" />
              Navegar
            </Button>
            {customerPhone && (
              <Button variant="outline" size="sm" onClick={() => window.open(`tel:${customerPhone}`, '_self')}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => router.push(`/domiciliario/escanear?orderId=${order.id}`)}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>

          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estado Actual:</span>
                  <p className="font-medium capitalize text-primary">
                    {STATUS_LABELS[order.status as OrderStatus] || order.status.replace('_', ' ')}
                  </p>
                </div>
                {order.actual_weight && (
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <p className="font-medium">{order.actual_weight} kg</p>
                  </div>
                )}
              </div>

              {isPickup && (
                <div className="space-y-3">
                  {order.status === 'pendiente' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`weight-${order.id}`} className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Peso total al recoger (kg)
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
                      <Button className="w-full" onClick={handlePickup} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Confirmar Recogida
                      </Button>
                    </>
                  )}

                  {(order.status === 'recogido' || order.status === 'en_transito' || order.status === 'en_deposito') && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-1 text-center">Fase de traslado a lavandería</p>
                      
                      {/* Si está "Recogido", puede pasarlo a "En Tránsito" o directo a "En Depósito" */}
                      {order.status === 'recogido' && (
                        <>
                          <Button 
                            variant="outline" 
                            className="w-full bg-orange-50 hover:bg-orange-100 hover:text-orange-700 text-orange-600 border-orange-200"
                            onClick={() => handleUpdateStatus('en_transito' as OrderStatus, 'Orden marcada en tránsito', 'Domiciliario en camino hacia la lavandería')}
                            disabled={loading}
                          >
                            <Truck className="mr-2 h-4 w-4" /> Marcar "En Tránsito"
                          </Button>
                          <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleUpdateStatus('en_deposito' as OrderStatus, 'Ropa entregada en depósito', 'Ropa entregada en las instalaciones de la lavandería')}
                            disabled={loading}
                          >
                            <Store className="mr-2 h-4 w-4" /> Entregar en Lavandería (En Depósito)
                          </Button>
                        </>
                      )}

                      {/* Si está "En Tránsito", puede Deshacerlo o pasarlo a "En Depósito" */}
                      {order.status === 'en_transito' && (
                        <>
                          <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleUpdateStatus('en_deposito' as OrderStatus, 'Ropa entregada en depósito', 'Ropa entregada en las instalaciones de la lavandería')}
                            disabled={loading}
                          >
                            <Store className="mr-2 h-4 w-4" /> Entregar en Lavandería (En Depósito)
                          </Button>
                          <Button 
                            variant="ghost" size="sm" className="text-muted-foreground"
                            onClick={() => handleUpdateStatus('recogido' as OrderStatus, 'Estado revertido a recogido', 'El domiciliario deshizo el estado "En Tránsito"')}
                            disabled={loading}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" /> Deshacer "En Tránsito"
                          </Button>
                        </>
                      )}

                      {/* Si está "En Depósito", puede Deshacerlo y regresar a "En Tránsito" */}
                      {order.status === 'en_deposito' && (
                        <Button 
                          variant="ghost" size="sm" className="text-muted-foreground"
                          onClick={() => handleUpdateStatus('en_transito' as OrderStatus, 'Estado revertido a en tránsito', 'El domiciliario deshizo la entrega en depósito')}
                          disabled={loading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Deshacer "Entrega en Lavandería"
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isPickup && order.status === 'en_ruta_entrega' && (
                <Button className="w-full bg-green-600 hover:bg-green-700" 
                  onClick={() => handleUpdateStatus('entregado' as OrderStatus, 'Entrega completada', 'Entregado al cliente por domiciliario')} 
                  disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Confirmar Entrega
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}