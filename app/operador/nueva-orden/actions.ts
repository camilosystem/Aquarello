'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const getAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado en el servidor')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type OrdenInput = {
  qr_code: string
  reception_code: string
  walk_in_name: string
  walk_in_phone: string
  operator_id: string
  pickup_address: string
  estimated_price: number
  preferences: {
    separate_whites: boolean
    separate_colors: boolean
    use_softener: boolean
    use_degreaser: boolean
    use_bleach: boolean
    fragrance: string
    stain_treatment: boolean
    stain_count: number
    ironing_required: boolean
    special_folding: boolean
    delicate_care: boolean
    notes: string | null
  }
}

export async function createOrdenOperadorAction(
  data: OrdenInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        qr_code: data.qr_code,
        reception_code: data.reception_code,
        user_id: null,
        walk_in_name: data.walk_in_name,
        walk_in_phone: data.walk_in_phone,
        operator_id: data.operator_id,
        status: 'pendiente',
        pickup_address: data.pickup_address,
        estimated_price: data.estimated_price,
      })
      .select('id')
      .single()

    if (orderError) return { ok: false, error: orderError.message }

    await admin.from('order_preferences').insert({
      order_id: order.id,
      separate_whites:     data.preferences.separate_whites,
      separate_colors:     data.preferences.separate_colors,
      use_softener:        data.preferences.use_softener,
      use_degreaser:       data.preferences.use_degreaser,
      use_bleach:          data.preferences.use_bleach,
      scent:               data.preferences.fragrance,
      stain_treatment:     data.preferences.stain_treatment,
      stain_count:         data.preferences.stain_count,
      special_instructions: data.preferences.notes,
    })

    await admin.from('order_history').insert({
      order_id: order.id,
      status: 'pendiente',
      notes: `Orden creada por operador para ${data.walk_in_name}, pendiente de recogida`,
      changed_by: data.operator_id,
    })

    revalidatePath('/operador/tickets')
    return { ok: true, id: order.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
