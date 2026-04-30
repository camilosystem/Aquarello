import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/operador/sidebar'
import { NuevaOrdenForm } from '@/components/operador/nueva-orden-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NuevaOrdenPage() {
  const supabase = await createClient()

  if (!supabase) {
    redirect('/operador/login')
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/operador/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'operador' && profile.role !== 'admin')) {
    redirect('/operador/login')
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar user={user} />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/operador">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nueva Orden</h1>
              <p className="text-muted-foreground">
                Registro de cliente sin cuenta — ingresa directamente en planta
              </p>
            </div>
          </div>

          <NuevaOrdenForm operadorId={user.id} />
        </div>
      </main>
    </div>
  )
}
