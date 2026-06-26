'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { 
  MapPin, Phone, QrCode, Navigation, CheckCircle2, Scale, 
  Loader2, ChevronDown, ChevronUp, User, Truck, Store, RotateCcw, Lock, PackageCheck, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { STATUS_LABELS, formatOrderNumber, type OrderStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { PaymentButton } from '@/components/payment-button'

interface TaskCardProps {
  order: any 
  type: 'pickup' | 'delivery'
  onUpdate?: () => void
}

export function TaskCard({ order, type, onUpdate }: TaskCardProps) {
  const supabase = createClient()!
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [weight, setWeight] = useState('')
  
  // Security code states
  const [showCodePrompt, setShowCodePrompt] = useState(false)
  const [securityCode, setSecurityCode] = useState('')

  const isPickup = type === 'pickup'
  const address = isPickup ? order.pickup_address : (order.delivery_address || order.pickup_address)

  const customerName = order.cliente?.full_name || 'No name'
  const customerPhone = order.cliente?.phone || ''

  const handleNavigate = () => {
    const lat = isPickup ? order.pickup_lat : order.delivery_lat
    const lng = isPickup ? order.pickup_lng : order.delivery_lng
    
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
    }
  }

  const handlePickup = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Enter the bag weight')
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
        notes: `Picked up by driver. Weight: ${weight} lb`,
        changed_by: user?.id,
      })
      toast.success('Pickup completed')
      onUpdate?.()
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Error processing the pickup'}`)
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
      setShowCodePrompt(false)
      setSecurityCode('')
      onUpdate?.()
    } catch (error: any) {
      toast.error('Error updating status')
    } finally {
      setLoading(false)
    }
  }

  // --- CODE VALIDATION LOGIC ---
  const handleVerifyCodeAndDeliver = async () => {
    if (!securityCode || securityCode.length !== 6) {
      toast.error('The code must have 6 digits')
      return
    }

    if (securityCode !== order.reception_code) {
      toast.error('Incorrect code. Ask the operator for the correct code.')
      return
    }

    // If the code is correct, mark as "en_deposito"
    await handleUpdateStatus('en_deposito' as OrderStatus, 'Bag delivered successfully to the Operator', 'Delivered to facility via security code')
  }

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:border-primary/30 transition-colors">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={isPickup ? 'border-primary text-primary bg-primary/5' : 'border-green-500 text-green-600 bg-green-500/5'}>
                  {isPickup ? 'Pickup' : 'Delivery'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: enUS })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{formatOrderNumber((order as any).order_number)}</span>
                <span className="text-xs font-mono text-muted-foreground">{order.qr_code}</span>
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
              Navigate
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
                  <span className="text-muted-foreground">Current Status:</span>
                  <p className="font-medium capitalize text-primary">
                    {STATUS_LABELS[order.status as OrderStatus] || order.status.replace('_', ' ')}
                  </p>
                </div>
                {order.actual_weight && (
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <p className="font-medium">{order.actual_weight} lb</p>
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
                          Total weight at pickup (kg)
                        </Label>
                        <Input
                          id={`weight-${order.id}`}
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="E.g.: 3.5"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                        />
                      </div>
                      <Button className="w-full" onClick={handlePickup} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Confirm Pickup
                      </Button>
                    </>
                  )}

                  {/* Actions for Picked Up and In Transit */}
                  {(order.status === 'recogido' || order.status === 'en_transito') && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-1 text-center">Transit to laundry phase</p>

                      {order.status === 'recogido' && (
                        <Button
                          variant="outline"
                          className="w-full bg-orange-50 hover:bg-orange-100 hover:text-orange-700 text-orange-600 border-orange-200"
                          onClick={() => handleUpdateStatus('en_transito' as OrderStatus, 'Order marked in transit', 'Driver on the way to the laundry')}
                          disabled={loading}
                        >
                          <Truck className="mr-2 h-4 w-4" /> Mark &quot;In Transit&quot;
                        </Button>
                      )}

                      {/* Deliver-to-laundry button with lock logic */}
                      {showCodePrompt ? (
                        <div className="p-3 bg-muted rounded-lg border space-y-3 animate-in fade-in slide-in-from-top-2">
                          <Label className="text-xs text-center block text-indigo-600 font-bold flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" /> Ask the operator for the code
                          </Label>
                          <Input
                            type="text"
                            maxLength={6}
                            placeholder="E.g.: 123456"
                            className="text-center font-mono tracking-widest text-lg"
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))} // Numbers only
                          />
                          <div className="flex gap-2">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowCodePrompt(false)}>
                              Cancel
                            </Button>
                            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleVerifyCodeAndDeliver} disabled={loading}>
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => setShowCodePrompt(true)}
                          disabled={loading}
                        >
                          <Store className="mr-2 h-4 w-4" /> Deliver to Laundry (At Facility)
                        </Button>
                      )}

                      {/* If in transit, can also undo the action if the code hasn't been entered yet */}
                      {order.status === 'en_transito' && !showCodePrompt && (
                        <Button
                          variant="ghost" size="sm" className="text-muted-foreground mt-2"
                          onClick={() => handleUpdateStatus('recogido' as OrderStatus, 'Status reverted to picked up', 'Driver undid the "In Transit" status')}
                          disabled={loading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Undo &quot;In Transit&quot;
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Delivery confirmation (M4) */}
              {!isPickup && (
                <div className="space-y-3">
                  {order.status === 'en_ruta_entrega' && (
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <PackageCheck className="h-4 w-4 text-green-600 shrink-0" />
                        <p className="text-xs text-green-700 font-medium">
                          Ready for delivery. Confirm once the client receives their laundry.
                        </p>
                      </div>

                      {/* Payment */}
                      <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg border">
                        <span className="text-xs text-muted-foreground font-medium">Charge to client</span>
                        <PaymentButton
                          orderId={order.id}
                          orderAmount={order.final_price ?? order.estimated_price ?? null}
                          onPaid={onUpdate}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            disabled={loading}
                          >
                            {loading
                              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                              : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Final Delivery</>
                            }
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                              Confirm final delivery?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>
                                You are about to mark order <strong>{formatOrderNumber((order as any).order_number)}</strong> as <strong>delivered</strong>.
                              </p>
                              <p className="text-sm">
                                This action is irreversible. Make sure the client has received their laundry in good condition.
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                setLoading(true)
                                try {
                                  const { data: { user } } = await supabase.auth.getUser()
                                  const { error } = await supabase
                                    .from('orders')
                                    .update({
                                      status: 'entregado' as OrderStatus,
                                      actual_delivery: new Date().toISOString(),
                                      updated_at: new Date().toISOString(),
                                    })
                                    .eq('id', order.id)

                                  if (error) throw error

                                  await supabase.from('order_history').insert({
                                    order_id: order.id,
                                    status: 'entregado',
                                    notes: 'Final delivery confirmed by driver.',
                                    changed_by: user?.id,
                                  })

                                  toast.success('Delivery confirmed! Order completed.')
                                  onUpdate?.()
                                } catch (e: any) {
                                  toast.error(`Error: ${e.message || 'Error confirming delivery'}`)
                                } finally {
                                  setLoading(false)
                                }
                              }}
                            >
                              Yes, confirm delivery
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {order.status === 'entregado' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-700">Delivery completed ✓</p>
                    </div>
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