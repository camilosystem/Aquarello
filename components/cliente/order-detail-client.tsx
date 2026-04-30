'use client'

import { useState, useEffect, useRef } from 'react'
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
  AlertTriangle,
  Send,
  Wallet
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
import { cn } from '@/lib/utils'
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

type PaymentMethod = 'tarjeta' | 'nequi' | 'efectivo' | 'transferencia' | 'daviplata'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'tarjeta',       label: 'Tarjeta',       icon: CreditCard,  color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'nequi',         label: 'Nequi',         icon: Smartphone,  color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'daviplata',     label: 'Daviplata',     icon: Smartphone,  color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'transferencia', label: 'Transferencia', icon: Send,        color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'efectivo',      label: 'Efectivo',      icon: Banknote,    color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
]

interface OrderDetailClientProps {
  order: Order
  preferences: OrderPreferences | null
  history: OrderHistory[]
  payment: Payment | null
  receipt: Receipt | null
}

export function OrderDetailClient({ 
  order: initialOrder, 
  preferences, 
  history: initialHistory, 
  payment: initialPayment,
  receipt: initialReceipt
}: OrderDetailClientProps) {
  const supabase = createClient()
  const [order, setOrder] = useState(initialOrder)
  const [history, setHistory] = useState(initialHistory)
  const [receipt, setReceipt] = useState(initialReceipt)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tarjeta')
  const [processing, setProcessing] = useState(false)
  const [payment, setPayment] = useState(initialPayment)
  const [statusChanged, setStatusChanged] = useState(false)
  const [subStatus, setSubStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const prevStatusRef = useRef(initialOrder.status)

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

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`order-detail-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => {
          const updated = payload.new as typeof order
          if (updated.status !== prevStatusRef.current) {
            setStatusChanged(true)
            setTimeout(() => setStatusChanged(false), 1500)
            prevStatusRef.current = updated.status
            toast.info(`Estado actualizado: ${STATUS_LABELS[updated.status as keyof typeof STATUS_LABELS] ?? updated.status}`)
          }
          setOrder(prev => ({ ...prev, ...updated }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_history', filter: `order_id=eq.${order.id}` },
        (payload) => {
          setHistory(prev => [payload.new as typeof initialHistory[0], ...prev])
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSubStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSubStatus('error')
        else setSubStatus('connecting')
      })

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const canPay = order.status === 'listo' || order.status === 'en_ruta_entrega'
  const isPaid = payment?.status === 'completado'
  const isDelivered = order.status === 'entregado'

  const handlePayment = async () => {
    if (!supabase) return
    setProcessing(true)
    try {
      // Brief artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 800))

      const totalAmount = order.final_price || order.estimated_price || 0
      const transactionId = `TRX-${Date.now()}`

      // Insert payment
      const { data: newPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: totalAmount,
          payment_method: paymentMethod,
          status: 'completado',
          transaction_id: transactionId,
          paid_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Create receipt if it doesn't exist yet
      if (!receipt) {
        const receiptNumber = `REC-${Date.now().toString(36).toUpperCase()}`
        const { data: newReceipt } = await supabase
          .from('receipts')
          .insert({
            order_id: order.id,
            receipt_number: receiptNumber,
            subtotal: totalAmount,
            tax: 0,
            total: totalAmount,
            sent_to_client: false,
          })
          .select()
          .single()
        if (newReceipt) setReceipt(newReceipt)
      }

      setPayment(newPayment)
      setPaymentDialogOpen(false)
      toast.success('¡Pago realizado exitosamente!')
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
      <Card className={cn('transition-all duration-300', statusChanged && 'ring-2 ring-primary shadow-lg shadow-primary/10')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Estado del Pedido</CardTitle>
              {subStatus === 'live' && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  En vivo
                </span>
              )}
              {subStatus === 'error' && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-500">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  Reconectando...
                </span>
              )}
              {subStatus === 'connecting' && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                  Conectando...
                </span>
              )}
            </div>
            <Badge
              variant={isDelivered ? 'default' : 'secondary'}
              className={cn(
                isDelivered ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary',
                statusChanged && 'animate-pulse'
              )}
            >
              {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status}
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
          {/* Price breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lavado base ({order.weight_kg ?? 0} kg × $8.000)</span>
              <span>{formatCOP((order.weight_kg ?? 0) * 8000)}</span>
            </div>
            {preferences?.separate_whites && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Separar blancos</span>
                <span>+ {formatCOP(3000)}</span>
              </div>
            )}
            {preferences?.use_softener && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suavizante</span>
                <span>+ {formatCOP(2000)}</span>
              </div>
            )}
            {preferences?.use_bleach && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Blanqueador</span>
                <span>+ {formatCOP(2500)}</span>
              </div>
            )}
            {preferences?.use_degreaser && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Desengrasante</span>
                <span>+ {formatCOP(3000)}</span>
              </div>
            )}
            {preferences?.ironing_required && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Planchado</span>
                <span>+ {formatCOP(5000)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex items-center justify-between font-bold text-base">
              <span>{order.final_price ? 'Total' : 'Estimado'}</span>
              <span className="text-primary">
                {formatCOP(order.final_price || order.estimated_price || 0)}
              </span>
            </div>
          </div>

          {isPaid ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Pago completado</p>
                <p className="text-sm capitalize">
                  {payment?.payment_method} — {payment?.transaction_id}
                </p>
              </div>
            </div>
          ) : canPay ? (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Wallet className="mr-2 h-4 w-4" />
                  Pagar Ahora
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Selecciona método de pago</DialogTitle>
                  <DialogDescription>
                    Total: {formatCOP(order.final_price || order.estimated_price || 0)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                  {/* Payment method grid */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {PAYMENT_METHODS.map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all',
                          paymentMethod === value
                            ? color + ' border-current ring-2 ring-offset-1'
                            : 'border-border hover:border-muted-foreground/40'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'tarjeta' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
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

                  {(paymentMethod === 'nequi' || paymentMethod === 'daviplata') && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label>Número de celular</Label>
                      <Input placeholder="300 123 4567" type="tel" />
                    </div>
                  )}

                  {paymentMethod === 'transferencia' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                        <p className="font-medium">Datos bancarios</p>
                        <p className="text-muted-foreground">Banco: Bancolombia</p>
                        <p className="text-muted-foreground">Cuenta: 123-456789-00</p>
                        <p className="text-muted-foreground">NIT: 900.123.456-7</p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'efectivo' && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                        El domiciliario recibirá el pago en efectivo al momento de la entrega.
                      </div>
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
                      `Confirmar pago — ${formatCOP(order.final_price || order.estimated_price || 0)}`
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
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recibo Oficial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Nº recibo</span>
                <span className="font-mono text-foreground">{receipt.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCOP(receipt.subtotal)}</span>
              </div>
              {receipt.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCOP(receipt.tax)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Total pagado</span>
                <span className="text-green-600">{formatCOP(receipt.total)}</span>
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
