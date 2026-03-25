'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface MachineTimerProps {
  machineId: string
  endTime: string        // ISO timestamp
  totalMinutes: number   // for calculating the arc fill
  type: 'lavadora' | 'secadora'
  onComplete?: () => void
  className?: string
}

const SIZE = 72
const STROKE = 6
const R = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

export function MachineTimer({
  machineId,
  endTime,
  totalMinutes,
  type,
  onComplete,
  className,
}: MachineTimerProps) {
  const supabase = createClient()
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [completed, setCompleted] = useState(false)

  const totalSeconds = totalMinutes * 60

  const autoComplete = useCallback(async () => {
    if (!supabase) return
    await supabase
      .from('machines')
      .update({ status: 'disponible', current_order_id: null, end_time: null })
      .eq('id', machineId)
    onComplete?.()
  }, [machineId, supabase, onComplete])

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
      if (diff === 0 && !completed) {
        setCompleted(true)
        autoComplete()
      }
    }

    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [endTime, completed, autoComplete])

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const color = type === 'lavadora' ? '#3b82f6' : '#f97316'

  if (completed) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <div className="text-xs font-semibold text-green-600 animate-pulse">✓ Listo</div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/40"
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        {/* Center text (rotated back) */}
        <text
          x={SIZE / 2}
          y={SIZE / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="currentColor"
          className="rotate-90 origin-center text-foreground"
          transform={`rotate(90, ${SIZE / 2}, ${SIZE / 2})`}
        >
          {mm}:{ss}
        </text>
      </svg>
    </div>
  )
}
