import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteHeader } from '@/components/cliente/header'
import { BottomNav } from '@/components/cliente/bottom-nav'
import { ServiceRequestForm } from '@/components/cliente/service-request-form'

export default async function ClientePage() {
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
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col">
      <ClienteHeader userName={profile?.full_name} />
      
      <main className="flex-1 container px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Request Service
          </h1>
          <p className="text-muted-foreground">
            We pick up, wash, and deliver your laundry
          </p>
        </div>

        <ServiceRequestForm 
          userId={user.id} 
          userAddress={profile?.address}
        />
      </main>

      <BottomNav />
    </div>
  )
}
