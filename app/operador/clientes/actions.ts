'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdmin = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function createClienteAction(data: {
  full_name: string
  email: string
  phone: string
  city: string
  address: string
  operator_notes: string
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
      address: data.address.trim() || null,
      role: 'cliente',
      operator_notes: data.operator_notes.trim() || null,
    })

    if (profileError) return { ok: false, error: profileError.message }

    revalidatePath('/operador/clientes')
    return { ok: true, id: authData.user.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateClienteAction(
  id: string,
  data: {
    full_name: string
    phone: string
    city: string
    address: string
    operator_notes: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()
    const { error } = await admin
      .from('profiles')
      .update({
        full_name: data.full_name.trim(),
        phone: data.phone.trim() || null,
        city: data.city.trim() || null,
        address: data.address.trim() || null,
        operator_notes: data.operator_notes.trim() || null,
      })
      .eq('id', id)

    if (error) return { ok: false, error: error.message }

    revalidatePath('/operador/clientes')
    revalidatePath(`/operador/clientes/${id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
