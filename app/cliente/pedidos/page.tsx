import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteHeader } from '@/components/cliente/header'
import { BottomNav } from '@/components/cliente/bottom-nav'
import { PedidosClient } from '@/components/cliente/pedidos-client'

export default async function PedidosPage() {
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

  // Get user orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen flex-col">
      <ClienteHeader userName={profile?.full_name} />

      <main className="flex-1 container px-4 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mis Pedidos</h1>
          <p className="text-muted-foreground">
            Seguimiento de tus servicios de lavandería
          </p>
        </div>

        <PedidosClient initialOrders={orders || []} userId={user.id} />
      </main>

      <BottomNav />
    </div>
  )
}
