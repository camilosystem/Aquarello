'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ItemInput = {
  name: string
  category: string
  unit: string
  min_stock: number
  max_stock: number
  cost_per_box: number
  units_per_box: number
}

export async function createItemAction(data: ItemInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Error de configuración del servidor' }
    const cost_per_unit = data.units_per_box > 0 ? data.cost_per_box / data.units_per_box : data.cost_per_box
    const { error } = await supabase.from('inventory').insert({
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      min_stock: data.min_stock,
      max_stock: data.max_stock,
      cost_per_box: data.cost_per_box,
      units_per_box: data.units_per_box,
      cost_per_unit,
      quantity: 0,
      is_active: true,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/inventario')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateItemAction(id: string, data: ItemInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Error de configuración del servidor' }
    const cost_per_unit = data.units_per_box > 0 ? data.cost_per_box / data.units_per_box : data.cost_per_box
    const { error } = await supabase.from('inventory').update({
      name: data.name.trim(),
      category: data.category.trim(),
      unit: data.unit.trim(),
      min_stock: data.min_stock,
      max_stock: data.max_stock,
      cost_per_box: data.cost_per_box,
      units_per_box: data.units_per_box,
      cost_per_unit,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/inventario')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteItemAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Error de configuración del servidor' }
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/inventario')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
