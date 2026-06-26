'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { generateQRCode } from '@/lib/types'

const getAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing service role key')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type DropOffInput = {
  walk_in_name: string
  walk_in_phone: string
  weight_kg: number
  final_price: number
  operator_id: string
  preferences: {
    separate_whites: boolean
    separate_colors: boolean
    use_softener: boolean
    use_bleach: boolean
    use_degreaser: boolean
    fragrance: string
    stain_treatment: boolean
    stain_count: number
    special_instructions: string | null
  }
}

export async function createDropOffAction(
  data: DropOffInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const admin = getAdmin()

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        qr_code: generateQRCode(),
        reception_code: Math.floor(100000 + Math.random() * 900000).toString(),
        user_id: null,
        walk_in_name: data.walk_in_name,
        walk_in_phone: data.walk_in_phone,
        operator_id: data.operator_id,
        status: 'en_deposito',
        pickup_address: 'Drop-off at plant',
        weight_kg: data.weight_kg,
        actual_weight: data.weight_kg,
        final_price: data.final_price,
        estimated_price: data.final_price,
        total_price: data.final_price,
      })
      .select('id')
      .single()

    if (orderError) return { ok: false, error: orderError.message }

    const { error: prefError } = await admin.from('order_preferences').insert({
      order_id: order.id,
      separate_whites:      data.preferences.separate_whites,
      separate_colors:      data.preferences.separate_colors,
      use_softener:         data.preferences.use_softener,
      use_bleach:           data.preferences.use_bleach,
      use_degreaser:        data.preferences.use_degreaser,
      scent:                data.preferences.fragrance,
      stain_treatment:      data.preferences.stain_treatment,
      stain_count:          data.preferences.stain_count,
      special_instructions: data.preferences.special_instructions,
    })

    if (prefError) return { ok: false, error: prefError.message }

    await admin.from('order_history').insert({
      order_id: order.id,
      status: 'en_deposito',
      notes: `Drop-off registered at plant for ${data.walk_in_name} — ${data.weight_kg} lb`,
      changed_by: data.operator_id,
    })

    revalidatePath('/operador/tickets')
    revalidatePath('/operador')
    return { ok: true, id: order.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
