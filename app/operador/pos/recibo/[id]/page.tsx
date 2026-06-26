import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReciboClient } from '@/components/operador/recibo-client'
import type { Order, OrderPreferences } from '@/lib/types'

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  if (!supabase) redirect('/operador/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/operador/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) redirect('/operador/pos')

  const { data: prefs } = await supabase
    .from('order_preferences')
    .select('*')
    .eq('order_id', id)
    .single()

  return (
    <ReciboClient
      order={order as Order}
      prefs={prefs as OrderPreferences | null}
    />
  )
}
