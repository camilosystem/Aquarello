import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { ClientesListClient } from '@/components/operador/clientes-list-client'

export default async function ClientesPage() {
  const supabase = await createClient()
  if (!supabase) redirect('/operador/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/operador/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) {
    redirect('/operador/login')
  }

  const { data: clientes } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'cliente')
    .order('created_at', { ascending: false })

  // Enrich city from most recent order's pickup_city when profile.city is missing or unreliable
  const clienteIds = clientes?.map((c) => c.id) ?? []
  let cityByUser: Record<string, string> = {}
  if (clienteIds.length > 0) {
    const { data: latestOrders } = await supabase
      .from('orders')
      .select('user_id, pickup_city, created_at')
      .in('user_id', clienteIds)
      .not('pickup_city', 'is', null)
      .order('created_at', { ascending: false })
    for (const o of latestOrders ?? []) {
      if (o.user_id && o.pickup_city && !cityByUser[o.user_id]) {
        cityByUser[o.user_id] = o.pickup_city
      }
    }
  }

  const enriched = (clientes ?? []).map((c) => ({
    ...c,
    city: cityByUser[c.id] ?? c.city ?? null,
  }))

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <ClientesListClient clientes={enriched} />
        </div>
      </main>
    </div>
  )
}
