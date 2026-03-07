import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteHeader } from '@/components/cliente/header'
import { BottomNav } from '@/components/cliente/bottom-nav'
import { OrderCard } from '@/components/cliente/order-card'
import { Package } from 'lucide-react'

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

  const activeOrders = orders?.filter(o => o.status !== 'entregado' && o.status !== 'cancelado') || []
  const pastOrders = orders?.filter(o => o.status === 'entregado' || o.status === 'cancelado') || []

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

        {(!orders || orders.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No tienes pedidos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Solicita tu primer servicio de lavandería
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active orders */}
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

            {/* Past orders */}
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
        )}
      </main>

      <BottomNav />
    </div>
  )
}
