import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { ClienteDetailClient } from '@/components/operador/cliente-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) redirect('/operador/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/operador/login')

  const { data: operadorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!operadorProfile || (operadorProfile.role !== 'operador' && operadorProfile.role !== 'admin')) {
    redirect('/operador/login')
  }

  const { data: cliente, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'cliente')
    .single()

  if (error || !cliente) notFound()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <ClienteDetailClient
            cliente={cliente}
            orders={orders ?? []}
          />
        </div>
      </main>
    </div>
  )
}
