'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function createDomiciliarioAction(data: {
  full_name: string
  email: string
  phone: string
  city: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()

    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase() +
      '1!'

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: data.email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name.trim() },
    })

    if (authError) return { ok: false, error: authError.message }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: authData.user.id,
      email: data.email.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim() || null,
      city: data.city.trim() || 'Bogotá',
      role: 'domiciliario',
      is_active: true,
    })

    if (profileError) return { ok: false, error: profileError.message }

    revalidatePath('/operador/domiciliarios')
    return { ok: true, id: authData.user.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateDomiciliarioAction(
  id: string,
  data: { full_name: string; phone: string; city: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()
    const { error } = await admin
      .from('profiles')
      .update({
        full_name: data.full_name.trim(),
        phone: data.phone.trim() || null,
        city: data.city.trim() || null,
      })
      .eq('id', id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/operador/domiciliarios')
    revalidatePath(`/operador/domiciliarios/${id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function toggleDomiciliarioActivoAction(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()
    const { error } = await admin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/operador/domiciliarios')
    revalidatePath(`/operador/domiciliarios/${id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
