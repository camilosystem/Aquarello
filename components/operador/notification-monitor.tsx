'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SETTINGS_ID, type AppSettings } from '@/app/operador/configuracion/settings'

export function NotificationMonitor() {
  const settingsRef = useRef<AppSettings | null>(null)

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load settings
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single()

      if (!data) return
      settingsRef.current = data as AppSettings

      // Check low stock immediately
      if (data.notif_low_stock) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('name, quantity, min_stock')

        if (inventory) {
          const low = inventory.filter((i: any) => (i.quantity ?? 0) <= (i.min_stock ?? 0))
          if (low.length > 0) {
            toast.warning('Low inventory stock', {
              description: low.map((i: any) => i.name).join(', '),
              duration: 8000,
            })
          }
        }
      }
    }

    init()

    // Realtime subscriptions
    const channel = supabase
      .channel('notification-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (settingsRef.current?.notif_new_order) {
          toast.info('New order received', {
            description: `Code: ${(payload.new as any).qr_code ?? '—'}`,
            duration: 6000,
          })
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const newStatus = (payload.new as any).status
        const qr = (payload.new as any).qr_code ?? '—'
        if (settingsRef.current?.notif_order_ready && newStatus === 'listo') {
          toast.success('Order ready for delivery', {
            description: `Code: ${qr}`,
            duration: 6000,
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}
