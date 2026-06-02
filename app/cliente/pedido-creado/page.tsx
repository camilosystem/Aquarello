'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Package, Clock, MapPin, ArrowRight, Home, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { formatCOP, formatOrderNumber } from '@/lib/types'
import Link from 'next/link'
import QRCode from 'qrcode'

interface Order {
  id: string
  order_number: number | null
  qr_code: string
  status: string
  pickup_address: string
  total_price: number
  created_at: string
}

function PedidoCreadoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('id')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrImage, setQrImage] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !supabase) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (data) {
        setOrder(data)
        // Generar la imagen del QR
        try {
          const qrDataUrl = await QRCode.toDataURL(data.qr_code, {
            width: 250,
            margin: 2,
            color: { dark: "#0891b2", light: "#ffffff" },
          })
          setQrImage(qrDataUrl)
        } catch (err) {
          console.error("Error generating QR:", err)
        }
      }
      setLoading(false)
    }

    fetchOrder()
  }, [orderId, supabase])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4" />
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedido Creado Exitosamente</h1>
          <p className="text-muted-foreground mt-1">Tu solicitud ha sido registrada</p>
        </div>
      </div>

      {order && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Tu Número de Pedido</CardTitle>
              <CardDescription>Usa este número para hacer seguimiento de tu orden</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-3">
              <p className="text-4xl font-bold tracking-widest text-primary">{formatOrderNumber(order.order_number)}</p>
              <p className="text-xs text-muted-foreground">Código QR para el domiciliario</p>
              {qrImage ? (
                <img src={qrImage} alt="QR Code" className="w-36 h-36 rounded-xl bg-white p-2 shadow-sm" />
              ) : (
                <QrCode className="h-24 w-24 text-muted-foreground opacity-50" />
              )}
              <p className="font-mono text-xs text-muted-foreground">{order.qr_code}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Detalles del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Dirección de recogida</p>
                  <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tiempo estimado</p>
                  <p className="text-sm text-muted-foreground">Dentro de las próximas 2-4 horas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="space-y-3">
        {order && (
          <Button className="w-full" onClick={() => router.push(`/cliente/pedidos/${order.id}`)}>
            Ver Detalle del Pedido
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/cliente">
            <Home className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function PedidoCreadoPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <PedidoCreadoContent />
    </Suspense>
  )
}