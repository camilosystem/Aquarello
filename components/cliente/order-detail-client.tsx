'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import QRCode from 'qrcode'
import { 
  ArrowLeft, 
  QrCode, 
  MapPin, 
  Scale, 
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  Loader2,
  Shirt,
  Droplets,
  Sparkles,
  Wind,
  Palette,
  Star,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { OrderStatusTimeline } from './order-status-timeline'
import { createClient } from '@/lib/supabase/client'
import { 
  STATUS_LABELS, 
  formatCOP, 
  FRAGRANCE_OPTIONS,
  type Order, 
  type OrderPreferences, 
  type OrderHistory, 
  type Payment, 
  type Receipt 
} from '@/lib/types'

interface OrderDetailClientProps {
  order: Order
  preferences: OrderPreferences | null
  history: OrderHistory[]
  payment: Payment | null
  receipt: Receipt | null
}

export function OrderDetailClient({ 
  order, 
  preferences, 
  history, 
  payment: initialPayment,
  receipt 
}: OrderDetailClientProps) {
  const supabase = createClient()
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'nequi'>('tarjeta')
  const [processing, setProcessing] = useState(false)
  const [payment, setPayment] = useState(initialPayment)

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(order.qr_code, {
          width: 200,
          margin: 2,
          color: {
            dark: '#0891b2',
            light: '#ffffff',
          },
        })
        setQrCodeDataUrl(url)
      } catch (err) {
        console.error('Error generating QR code:', err)
      }
    }
    generateQR()
  }, [order.qr_code])

  const canPay = order.status === 'listo' || order.status === 'en_ruta_entrega'
  const isPaid = payment?.status === 'completado'
  const isDelivered = order.status === 'entregado'

  const handlePayment = async () => {
    setProcessing(true)
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: order.final_price || order.estimated_price || 0,
          payment_method: paymentMethod,
          status: 'completado',
          transaction_id: `TRX-${Date.now()}`,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setPayment(newPayment)
      setPaymentDialogOpen(false)
      toast.success('Pago realizado exitosamente')
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Error al procesar el pago. Intenta de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  const fragranceLabel = FRAGRANCE_OPTIONS.find(f => f.value === preferences?.fragrance)?.label || 'No seleccionada'

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-4">
        <Link href="/cliente/pedidos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Detalle del Pedido</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.qr_code}</p>
        </div>
      </div>

      {/* QR Code Card */}
      <Card>
        <CardContent className="flex flex-col items-center py-6">
          {qrCodeDataUrl ? (
            <img 
              src={qrCodeDataUrl} 
              alt={`QR Code: ${order.qr_code}`}
              className="w-48 h-48 rounded-lg border"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
              <QrCode className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Muestra este código al domiciliario
          </p>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Estado del Pedido</CardTitle>
            <Badge 
              variant={isDelivered ? 'default' : 'secondary'}
              className={isDelivered ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary'}
            >
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline currentStatus={order.status} />
        </CardContent>
      </Card>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Dirección de recogida</p>
              <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
            </div>
          </div>

          {order.weight_kg && (
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Peso</p>
                <p className="text-sm text-muted-foreground">{order.weight_kg} kg</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Fecha de solicitud</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "d 'de' MMMM, yyyy 'a las' h:mm a", { locale: es })}
              </p>
            </div>
          </div>

          {order.estimated_delivery && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Entrega estimada</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.estimated_delivery), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preferencias de Lavado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {preferences.separate_whites && (
                <div className="flex items-center gap-2 text-sm">
                  <Shirt className="h-4 w-4 text-primary" />
                  <span>Separar blancos</span>
                </div>
              )}
              {preferences.use_softener && (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="h-4 w-4 text-primary" />
                  <span>Suavizante</span>
                </div>
              )}
              {preferences.use_bleach && (
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Blanqueador</span>
                </div>
              )}
              {preferences.use_degreaser && (
                <div className="flex items-center gap-2 text-sm">
                  <Wind className="h-4 w-4 text-primary" />
                  <span>Desengrasante</span>
                </div>
              )}
              {preferences.stain_treatment && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span>Quita manchas</span>
                </div>
              )}
              {preferences.delicate_care && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Cuidado delicado</span>
                </div>
              )}
              {preferences.ironing_required && (
                <div className="flex items-center gap-2 text-sm">
                  <Shirt className="h-4 w-4 text-primary" />
                  <span>Planchado</span>
                </div>
              )}
              {preferences.special_folding && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Doblado especial</span>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-primary" />
              <span>Fragancia: {fragranceLabel}</span>
            </div>
            {preferences.notes && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{preferences.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Price and Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {order.final_price ? 'Total' : 'Estimado'}
            </span>
            <span className="text-xl font-bold text-primary">
              {formatCOP(order.final_price || order.estimated_price || 0)}
            </span>
          </div>

          {isPaid ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Pago completado</p>
                <p className="text-sm">
                  {payment?.payment_method === 'tarjeta' ? 'Tarjeta de crédito' : 'Nequi'} - {payment?.transaction_id}
                </p>
              </div>
            </div>
          ) : canPay ? (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar Ahora
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Realizar Pago</DialogTitle>
                  <DialogDescription>
                    Total a pagar: {formatCOP(order.final_price || order.estimated_price || 0)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={paymentMethod === 'tarjeta' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setPaymentMethod('tarjeta')}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-xs">Tarjeta</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'nequi' ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setPaymentMethod('nequi')}
                    >
                      <Smartphone className="h-6 w-6" />
                      <span className="text-xs">Nequi</span>
                    </Button>
                  </div>

                  {paymentMethod === 'tarjeta' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Número de tarjeta</Label>
                        <Input placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Vencimiento</Label>
                          <Input placeholder="MM/AA" />
                        </div>
                        <div className="space-y-2">
                          <Label>CVV</Label>
                          <Input placeholder="123" type="password" />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'nequi' && (
                    <div className="space-y-2">
                      <Label>Número Nequi</Label>
                      <Input placeholder="300 123 4567" type="tel" />
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={handlePayment}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      `Pagar ${formatCOP(order.final_price || order.estimated_price || 0)}`
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-muted text-muted-foreground rounded-lg">
              <Banknote className="h-5 w-5" />
              <span className="text-sm">
                Podrás pagar cuando tu pedido esté listo
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt */}
      {receipt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recibo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número de recibo:</span>
                <span className="font-mono">{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCOP(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span>{formatCOP(receipt.tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatCOP(receipt.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="font-medium">{STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}</p>
                    {item.notes && (
                      <p className="text-muted-foreground">{item.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.created_at), "d MMM, h:mm a", { locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
