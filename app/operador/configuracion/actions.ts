'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export type AppSettings = {
  price_per_kg: number
  min_price: number
  price_ironing: number
  price_softener: number
  price_bleach: number
  price_degreaser: number
  price_stain_treatment: number
  price_delicate_care: number
  price_special_folding: number
  price_express: number
  opening_time: string
  closing_time: string
  avg_wash_minutes: number
  notif_new_order: boolean
  notif_low_stock: boolean
  notif_order_ready: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  price_per_kg: 8000,
  min_price: 25000,
  price_ironing: 5000,
  price_softener: 2000,
  price_bleach: 1500,
  price_degreaser: 2500,
  price_stain_treatment: 4000,
  price_delicate_care: 2000,
  price_special_folding: 1000,
  price_express: 10000,
  opening_time: '07:00',
  closing_time: '20:00',
  avg_wash_minutes: 120,
  notif_new_order: true,
  notif_low_stock: true,
  notif_order_ready: true,
}

export async function loadSettingsAction(): Promise<AppSettings> {
  try {
    const supabase = await createClient()
    if (!supabase) return DEFAULT_SETTINGS
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single()
    if (!data) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...data } as AppSettings
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettingsAction(
  patch: Partial<AppSettings>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Error de configuración del servidor' }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('app_settings').upsert({
      id: SETTINGS_ID,
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/configuracion')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
