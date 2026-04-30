'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderCard } from './order-card'
import { Package } from 'lucide-react'
import type { Order } from '@/lib/types'

interface PedidosClientProps {
  initialOrders: Order[]
  userId: string
}

export function PedidosClient({ initialOrders, userId }: PedidosClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel(`client-orders-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          setOrders(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        (payload) => {
          setOrders(prev => [payload.new as Order, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const activeOrders = orders.filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
  const pastOrders = orders.filter(o => o.status === 'entregado' || o.status === 'cancelado')

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">No tienes pedidos</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Solicita tu primer servicio de lavandería
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {activeOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Pedidos Activos ({activeOrders.length})
          </h2>
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {pastOrders.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Historial ({pastOrders.length})
          </h2>
          <div className="space-y-3">
            {pastOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
