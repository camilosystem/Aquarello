import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteHeader } from '@/components/cliente/header'
import { BottomNav } from '@/components/cliente/bottom-nav'
import { OrderDetailClient } from '@/components/cliente/order-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  if (!supabase) {
    redirect('/cliente/login')
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/cliente/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Get order with preferences
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_preferences (*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !order) {
    notFound()
  }

  // Get order history
  const { data: history } = await supabase
    .from('order_history')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  // Get payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .eq('status', 'completado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get receipt
  const { data: receipt } = await supabase
    .from('receipts')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="flex min-h-screen flex-col">
      <ClienteHeader userName={profile?.full_name} />
      
      <main className="flex-1 container px-4 py-6 pb-24">
        <OrderDetailClient 
          order={order}
          preferences={order.order_preferences?.[0] || null}
          history={history || []}
          payment={payment || null}
          receipt={receipt || null}
        />
      </main>

      <BottomNav />
    </div>
  )
}
