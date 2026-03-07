import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteHeader } from '@/components/cliente/header'
import { BottomNav } from '@/components/cliente/bottom-nav'
import { ProfileForm } from '@/components/cliente/profile-form'

export default async function PerfilPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/cliente/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col">
      <ClienteHeader userName={profile?.full_name} />
      
      <main className="flex-1 container px-4 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Administra tu información personal
          </p>
        </div>

        <ProfileForm 
          profile={profile} 
          email={user.email || ''}
        />
      </main>

      <BottomNav />
    </div>
  )
}
