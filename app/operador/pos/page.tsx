import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { PosClient } from '@/components/operador/pos-client'
import { loadSettingsAction } from '@/app/operador/configuracion/actions'

export default async function PosPage() {
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

  const settings = await loadSettingsAction()

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">POS — Drop-Off</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Register a walk-in customer who drops off their bag at the plant
            </p>
          </div>
          <PosClient operadorId={user.id} settings={settings} />
        </div>
      </main>
    </div>
  )
}
