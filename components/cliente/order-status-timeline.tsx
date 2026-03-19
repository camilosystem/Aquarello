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

// Usamos string en lugar de un tipo estricto para evitar errores si types.ts no está actualizado
interface TimelineStep {
  status: string
  label: string
  icon: React.ElementType
}

// NUEVO ORDEN LÓGICO DE NUESTRA CADENA DE CUSTODIA
const TIMELINE_STEPS: TimelineStep[] = [
  { status: 'pendiente', label: 'Pendiente', icon: Clock },
  { status: 'recogido', label: 'Recogido', icon: Bike },
  { status: 'en_transito', label: 'En tránsito', icon: Truck },
  { status: 'en_deposito', label: 'En lavandería', icon: Building2 }, // Handshake exitoso
  { status: 'en_lavado', label: 'En lavado', icon: WashingMachine },
  { status: 'en_secado', label: 'En secado', icon: Wind },
  { status: 'en_alistamiento', label: 'Alistamiento', icon: Shirt },
  { status: 'en_ruta_entrega', label: 'En ruta', icon: MapPin },
  { status: 'entregado', label: 'Entregado', icon: CheckCircle2 },
]

// DICCIONARIO PARA SABER EN QUÉ NÚMERO DE PASO VAMOS (Incluye fallbacks por seguridad)
const STATUS_ORDER: Record<string, number> = {
  pendiente: 0,
  recogido: 1,
  en_transito: 2,
  en_transito_lavado: 2, // Por si queda algún pedido viejo
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
  // Obtenemos el índice actual. Si por alguna razón llega un estado raro, no rompemos la app (fallback a 0)
  const currentIndex = STATUS_ORDER[currentStatus] ?? 0
  const isCancelled = currentStatus === 'cancelado'

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
        <XCircle className="h-5 w-5" />
        <span className="font-medium">Pedido cancelado</span>
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
    pendiente: 'Esperando que un domiciliario recoja tu ropa',
    recogido: 'El domiciliario tiene tu bolsa de ropa',
    en_transito: 'El domiciliario va en camino hacia la lavandería',
    en_deposito: 'Tu ropa está segura en nuestras instalaciones',
    en_lavado: 'Tu ropa está siendo lavada con cuidado',
    en_secado: 'Tu ropa está en la secadora',
    en_alistamiento: 'Doblando y preparando tu ropa',
    en_ruta_entrega: 'El domiciliario va en camino a entregarte tu ropa',
    entregado: '¡Tu ropa ha sido entregada!',
  }
  return descriptions[status] || 'Procesando tu pedido...'
}