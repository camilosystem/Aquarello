'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ManualPaymentMethod = 'efectivo' | 'nequi' | 'brevo'

export async function registerManualPaymentAction(data: {
  order_id: string
  amount: number
  method: ManualPaymentMethod
  notes: string
  mark_as_paid: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    if (!supabase) return { ok: false, error: 'Server configuration error' }

    const { data: { user } } = await supabase.auth.getUser()

    const { error: payError } = await supabase.from('payments').insert({
      order_id: data.order_id,
      amount: data.amount,
      payment_method: data.method,
      status: 'completado',
      paid_at: new Date().toISOString(),
      notes: data.notes.trim() || null,
    })
    if (payError) return { ok: false, error: payError.message }

    const orderPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.mark_as_paid) {
      orderPatch.payment_status = 'pagado'
      orderPatch.final_price = data.amount
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update(orderPatch)
      .eq('id', data.order_id)
    if (orderError) return { ok: false, error: orderError.message }

    const historyNote = data.mark_as_paid
      ? `Full payment: ${data.method} — $${data.amount.toLocaleString('en-US')}${data.notes ? ` (${data.notes.trim()})` : ''}`
      : `Partial payment: ${data.method} — $${data.amount.toLocaleString('en-US')}${data.notes ? ` (${data.notes.trim()})` : ''}`

    await supabase.from('order_history').insert({
      order_id: data.order_id,
      status: data.mark_as_paid ? 'entregado' : null,
      notes: historyNote,
      changed_by: user?.id ?? null,
    })

    revalidatePath(`/operador/tickets/${data.order_id}`)
    revalidatePath('/operador/tickets')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export type PayUParams = {
  merchantId: string
  accountId: string
  description: string
  referenceCode: string
  amount: string
  tax: string
  taxReturnBase: string
  currency: string
  signature: string
  test: string
  buyerEmail: string
  responseUrl: string
  confirmationUrl: string
  payuUrl: string
}

export async function createPayUCheckoutAction(data: {
  order_id: string
  amount: number
  buyer_email: string
}): Promise<{ ok: true; params: PayUParams } | { ok: false; error: string }> {
  try {
    const apiKey     = process.env.PAYU_API_KEY
    const merchantId = process.env.PAYU_MERCHANT_ID
    const accountId  = process.env.PAYU_ACCOUNT_ID
    const isTest     = process.env.PAYU_TEST !== '0' ? '1' : '0'
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    if (!apiKey || !merchantId || !accountId) {
      return { ok: false, error: 'PayU no está configurado. Agrega PAYU_API_KEY, PAYU_MERCHANT_ID y PAYU_ACCOUNT_ID en las variables de entorno.' }
    }

    const referenceCode = `LVV-${data.order_id.slice(0, 8).toUpperCase()}`
    const amountStr = data.amount.toFixed(2)
    const signature = crypto
      .createHash('md5')
      .update(`${apiKey}~${merchantId}~${referenceCode}~${amountStr}~COP`)
      .digest('hex')

    const payuUrl = isTest === '1'
      ? 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/'
      : 'https://checkout.payulatam.com/ppp-web-gateway-payu/'

    return {
      ok: true,
      params: {
        merchantId,
        accountId,
        description: `Lavandería Aquarello — Orden ${referenceCode}`,
        referenceCode,
        amount: amountStr,
        tax: '0',
        taxReturnBase: '0',
        currency: 'COP',
        signature,
        test: isTest,
        buyerEmail: data.buyer_email || 'cliente@aquarello.co',
        responseUrl: `${appUrl}/api/payu/response`,
        confirmationUrl: `${appUrl}/api/webhooks/payu`,
        payuUrl,
      },
    }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
