'use client'

import { 
  Clock, 
  Bike, 
  Building2, 
  Truck, 
  WashingMachine, 
  Wind, 
  Shirt,
  MapPin,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// We use string instead of a strict type to avoid errors if types.ts is not updated
interface TimelineStep {
  status: string
  label: string
  icon: React.ElementType
}

// LOGICAL ORDER OF OUR CHAIN OF CUSTODY
const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'pendiente', label: 'Pending', icon: Clock },
  { status: 'recogido', label: 'Picked Up', icon: Bike },
  { status: 'en_transito', label: 'In Transit', icon: Truck },
  { status: 'en_deposito', label: 'At Facility', icon: Building2 }, // Successful handshake
  { status: 'en_lavado', label: 'Washing', icon: WashingMachine },
  { status: 'en_secado', label: 'Drying', icon: Wind },
  { status: 'en_alistamiento', label: 'Finishing', icon: Shirt },
  { status: 'en_ruta_entrega', label: 'Out for Delivery', icon: MapPin },
  { status: 'entregado', label: 'Delivered', icon: CheckCircle2 },
]

// LOOKUP TABLE FOR WHICH STEP NUMBER WE'RE ON (includes fallbacks for safety)
const STATUS_ORDER: Record<string, number> = {
  pendiente: 0,
  recogido: 1,
  en_transito: 2,
  en_transito_lavado: 2, // In case any old order remains
  en_deposito: 3,
  en_lavado: 4,
  en_secado: 5,
  en_alistamiento: 6,
  listo: 6, // Fallback
  en_ruta_entrega: 7,
  entregado: 8,
  completado: 8, // Fallback
  cancelado: -1,
}

interface OrderStatusTimelineProps {
  currentStatus: string
  compact?: boolean
}

export function OrderStatusTimeline({ currentStatus, compact = false }: OrderStatusTimelineProps) {
  // Get the current index. If an unexpected status arrives, don't break the app (fallback to 0)
  const currentIndex = STATUS_ORDER[currentStatus] ?? 0
  const isCancelled = currentStatus === 'cancelado'

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
        <XCircle className="h-5 w-5" />
        <span className="font-medium">Order cancelled</span>
      </div>
    )
  }

  if (compact) {
    // Compact horizontal timeline
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const Icon = step.icon

          return (
            <div key={step.status} className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-4 transition-colors',
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Full vertical timeline
  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex
        const Icon = step.icon
        const isLast = index === TIMELINE_STEPS.length - 1

        return (
          <div key={step.status} className="flex gap-4">
            {/* Icon and line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'h-8 w-0.5 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <p
                className={cn(
                  'font-medium leading-10 transition-colors',
                  isCompleted && 'text-primary',
                  isCurrent && 'text-foreground',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="mt-1 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
                  {getStatusDescription(step.status)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    pendiente: 'Waiting for a driver to pick up your laundry',
    recogido: 'The driver has your laundry bag',
    en_transito: 'The driver is on the way to the facility',
    en_deposito: 'Your laundry is safe at our facility',
    en_lavado: 'Your laundry is being washed with care',
    en_secado: 'Your laundry is in the dryer',
    en_alistamiento: 'Folding and preparing your laundry',
    en_ruta_entrega: 'The driver is on the way to deliver your laundry',
    entregado: 'Your laundry has been delivered!',
  }
  return descriptions[status] || 'Processing your order...'
}