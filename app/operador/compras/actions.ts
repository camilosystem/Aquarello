'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Suppliers ──────────────────────────────────────────────────────────────

type SupplierInput = {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  notes: string
}

export async function createSupplierAction(data: SupplierInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }
    const { error } = await supabase.from('suppliers').insert({
      name: data.name.trim(),
      contact_name: data.contact_name.trim() || null,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      address: data.address.trim() || null,
      notes: data.notes.trim() || null,
      is_active: true,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/compras')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateSupplierAction(id: string, data: SupplierInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }
    const { error } = await supabase.from('suppliers').update({
      name: data.name.trim(),
      contact_name: data.contact_name.trim() || null,
      phone: data.phone.trim() || null,
      email: data.email.trim() || null,
      address: data.address.trim() || null,
      notes: data.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/compras')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteSupplierAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/operador/compras')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ─── Purchases ───────────────────────────────────────────────────────────────

type PurchaseLine = {
  inventory_item_id: string
  quantity: number
  cost_per_box: number
  units_per_box: number
  unit_price: number
  total_price: number
}

type PurchaseInput = {
  supplier_id: string | null
  invoice_number: string
  purchase_date: string
  notes: string
  lines: PurchaseLine[]
}

export async function createPurchaseAction(data: PurchaseInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }

    if (data.lines.length === 0) return { ok: false, error: 'Add at least one item to the purchase' }

    const { data: { user } } = await supabase.auth.getUser()
    const total_amount = data.lines.reduce((sum, l) => sum + l.total_price, 0)

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        supplier_id: data.supplier_id || null,
        invoice_number: data.invoice_number.trim() || null,
        purchase_date: data.purchase_date,
        total_amount,
        notes: data.notes.trim() || null,
        created_by: user?.id ?? null,
      })
      .select('id')
      .single()

    if (purchaseError || !purchase) return { ok: false, error: purchaseError?.message ?? 'Error creating purchase' }

    const { error: itemsError } = await supabase.from('purchase_items').insert(
      data.lines.map(l => ({
        purchase_id: purchase.id,
        inventory_item_id: l.inventory_item_id,
        quantity: l.quantity,
        cost_per_box: l.cost_per_box,
        units_per_box: l.units_per_box,
        unit_price: l.unit_price,
        total_price: l.total_price,
      }))
    )

    if (itemsError) return { ok: false, error: itemsError.message }

    // Increment inventory quantities and update costs from this purchase
    for (const line of data.lines) {
      const { data: current } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', line.inventory_item_id)
        .single()

      if (current !== null) {
        const cost_per_unit = line.units_per_box > 0 ? line.cost_per_box / line.units_per_box : line.cost_per_box
        await supabase.from('inventory').update({
          quantity: (current.quantity ?? 0) + line.quantity,
          cost_per_box: line.cost_per_box,
          units_per_box: line.units_per_box,
          cost_per_unit,
          updated_at: new Date().toISOString(),
        }).eq('id', line.inventory_item_id)
      }
    }

    revalidatePath('/operador/inventario')
    revalidatePath('/operador/compras')
    return { ok: true, id: purchase.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deletePurchaseAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }

    // Reverse inventory increments before deleting
    const { data: items } = await supabase
      .from('purchase_items')
      .select('inventory_item_id, quantity')
      .eq('purchase_id', id)

    if (items) {
      for (const item of items) {
        const { data: current } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.inventory_item_id)
          .single()

        if (current !== null) {
          await supabase.from('inventory').update({
            quantity: Math.max(0, (current.quantity ?? 0) - item.quantity),
            updated_at: new Date().toISOString(),
          }).eq('id', item.inventory_item_id)
        }
      }
    }

    const { error } = await supabase.from('purchases').delete().eq('id', id)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/operador/inventario')
    revalidatePath('/operador/compras')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
