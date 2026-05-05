'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SETTINGS_ID, DEFAULT_SETTINGS, type AppSettings } from './settings'

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
