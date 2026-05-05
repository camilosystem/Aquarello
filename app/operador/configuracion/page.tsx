import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { ConfiguracionClient } from '@/components/operador/configuracion-client'
import { loadSettingsAction } from './actions'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  if (!supabase) redirect('/operador/login')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/operador/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
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
        <div className="max-w-4xl mx-auto space-y-6">
          <ConfiguracionClient
            settings={settings}
            operadorProfile={{
              full_name: profile.full_name ?? null,
              email: user.email ?? null,
              role: profile.role,
            }}
          />
        </div>
      </main>
    </div>
  )
}
