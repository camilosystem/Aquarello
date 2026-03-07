'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Package, Clock, MapPin, ArrowRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { formatCOP } from '@/lib/types'
import Link from 'next/link'

interface Order {
  id: string
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

      if (data) setOrder(data)
      setLoading(false)
    }

    fetchOrder()
  }, [orderId])

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
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedido Creado Exitosamente</h1>
          <p className="text-muted-foreground mt-1">
            Tu solicitud de lavanderia ha sido registrada
          </p>
        </div>
      </div>

      {/* Order Details Card */}
      {order && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Detalles del Pedido
            </CardTitle>
            <CardDescription>
              Codigo: {order.qr_code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Direccion de recogida</p>
                <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Tiempo estimado de recogida</p>
                <p className="text-sm text-muted-foreground">Dentro de las proximas 2-4 horas</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total estimado:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCOP(order.total_price)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                * El precio final se calculara al pesar tu ropa
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Proximos Pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { n: 1, title: 'Prepara tu ropa', desc: 'Coloca la ropa en una bolsa y tenla lista en la direccion indicada' },
              { n: 2, title: 'Domiciliario en camino', desc: 'Te notificaremos cuando el domiciliario este cerca' },
              { n: 3, title: 'Seguimiento en tiempo real', desc: 'Podras ver el estado de tu pedido en la seccion de pedidos' },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${step.n === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
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

      <p className="text-center text-xs text-muted-foreground">
        Si tienes alguna pregunta, contactanos al WhatsApp: +57 300 123 4567
      </p>
    </div>
  )
}

export default function PedidoCreadoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4" />
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      </div>
    }>
      <PedidoCreadoContent />
    </Suspense>
  )
}
