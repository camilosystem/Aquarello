import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { ComprasClient } from '@/components/operador/compras-client'

export default async function ComprasPage() {
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

  const [{ data: suppliers }, { data: purchasesRaw }, { data: inventoryItems }] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('purchases').select(`
      *,
      supplier:suppliers(*)
    `).order('purchase_date', { ascending: false }),
    supabase.from('inventory').select('*').order('name'),
  ])

  // Count items per purchase
  const purchaseIds = (purchasesRaw ?? []).map((p: any) => p.id)
  let itemCounts: Record<string, number> = {}
  if (purchaseIds.length > 0) {
    const { data: counts } = await supabase
      .from('purchase_items')
      .select('purchase_id')
      .in('purchase_id', purchaseIds)

    if (counts) {
      for (const row of counts) {
        itemCounts[row.purchase_id] = (itemCounts[row.purchase_id] ?? 0) + 1
      }
    }
  }

  const purchases = (purchasesRaw ?? []).map((p: any) => ({
    ...p,
    items_count: itemCounts[p.id] ?? 0,
  }))

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <ComprasClient
            suppliers={suppliers ?? []}
            purchases={purchases}
            inventoryItems={inventoryItems ?? []}
          />
        </div>
      </main>
    </div>
  )
}
