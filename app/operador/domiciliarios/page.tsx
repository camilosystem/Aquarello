import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { DomiciliariosListClient } from '@/components/operador/domiciliarios-list-client'

export default async function DomiciliariosPage() {
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

  const { data: domiciliarios } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'domiciliario')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <DomiciliariosListClient domiciliarios={domiciliarios ?? []} />
        </div>
      </main>
    </div>
  )
}
