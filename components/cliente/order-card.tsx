'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronRight, QrCode } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrderStatusTimeline } from './order-status-timeline'
import { STATUS_LABELS, formatUSD, formatOrderNumber, type Order } from '@/lib/types'

interface OrderCardProps {
  order: Order
}

export function OrderCard({ order }: OrderCardProps) {
  const isDelivered = order.status === 'entregado'
  const isCancelled = order.status === 'cancelado'

  return (
    <Link href={`/cliente/pedidos/${order.id}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{formatOrderNumber(order.order_number)}</span>
                <span className="font-mono text-xs text-muted-foreground">{order.qr_code}</span>
              </div>

              {/* Status badge */}
              <Badge
                variant={isDelivered ? 'default' : isCancelled ? 'destructive' : 'secondary'}
                className={
                  isDelivered 
                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                    : isCancelled
                    ? ''
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }
              >
                {STATUS_LABELS[order.status]}
              </Badge>

              {/* Timeline preview */}
              {!isDelivered && !isCancelled && (
                <OrderStatusTimeline currentStatus={order.status} compact />
              )}

              {/* Details */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {order.weight_kg && (
                  <span>{order.weight_kg} lb</span>
                )}
                <span>
                  {formatDistanceToNow(new Date(order.created_at), {
                    addSuffix: true,
                    locale: enUS,
                  })}
                </span>
                {(order.final_price || order.estimated_price) && (
                  <span className="font-medium text-foreground">
                    {formatUSD(order.final_price || order.estimated_price || 0)}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
