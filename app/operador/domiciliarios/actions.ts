'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function createDomiciliarioAction(data: {
  full_name: string
  email: string
  phone: string
  city: string
  password: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()

    if (data.password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters' }
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: data.email.trim(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name.trim() },
    })

    if (authError) return { ok: false, error: authError.message }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: authData.user.id,
      email: data.email.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim() || null,
      city: data.city.trim() || 'Jackson Heights',
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

export async function changePasswordDomiciliarioAction(
  id: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (newPassword.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters' }
    }
    const admin = getAdmin()
    const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword })
    if (error) return { ok: false, error: error.message }
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
