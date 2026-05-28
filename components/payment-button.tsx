'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { CreditCard, Banknote, Smartphone, CheckCircle2, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { registerManualPaymentAction, createPayUCheckoutAction, type ManualPaymentMethod, type PayUParams } from '@/app/operador/tickets/payment-actions'
import { formatCOP } from '@/lib/types'

interface Props {
  orderId: string
  orderAmount?: number | null
  buyerEmail?: string | null
  onPaid?: () => void
}

type Method = 'efectivo' | 'nequi' | 'brevo' | 'payu' | null

const METHODS = [
  {
    key: 'efectivo' as const,
    label: 'Efectivo',
    desc: 'Registrar pago recibido en efectivo',
    icon: Banknote,
    color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  },
  {
    key: 'payu' as const,
    label: 'Tarjeta / Wompi',
    desc: 'Pago online con tarjeta débito o crédito',
    icon: CreditCard,
    color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  },
  {
    key: 'nequi' as const,
    label: 'Nequi',
    desc: 'Confirmar transferencia por Nequi',
    icon: Smartphone,
    color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  },
  {
    key: 'brevo' as const,
    label: 'Bre-v',
    desc: 'Confirmar transferencia por Bre-v',
    icon: Smartphone,
    color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
  },
]

function submitPayUForm(params: PayUParams) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = params.payuUrl
  form.target = '_blank'
  const fields = { ...params }
  delete (fields as any).payuUrl
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = String(v)
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

export function PaymentButton({ orderId, orderAmount, buyerEmail, onPaid }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<Method>(null)
  const [amount, setAmount] = useState(String(orderAmount ?? ''))
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState(buyerEmail ?? '')
  const [paidSoFar, setPaidSoFar] = useState(0)
  const [isPending, startTransition] = useTransition()

  const total = orderAmount ?? 0
  const remaining = Math.max(0, total - paidSoFar)
  const parsedAmount = parseInt(amount) || 0
  const isFullPayment = parsedAmount > 0 && parsedAmount >= remaining
  const isFullyPaid = total > 0 && paidSoFar >= total

  // Load existing payments to calculate how much has been paid
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('status', 'completado')
      .then(({ data }) => {
        const paid = data?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0
        setPaidSoFar(paid)
      })
  }, [orderId])

  const resetDialog = () => {
    setMethod(null)
    setAmount(String(remaining > 0 ? remaining : (orderAmount ?? '')))
    setNotes('')
    setEmail(buyerEmail ?? '')
  }

  const handleClose = () => { setOpen(false); resetDialog() }

  const handleOpen = () => {
    setAmount(String(remaining > 0 ? remaining : (orderAmount ?? '')))
    setOpen(true)
  }

  // ── Cash / Nequi / Brevo ─────────────────────────────────────────────────
  const handleManualPay = () => {
    if (parsedAmount <= 0) { toast.error('Ingresa un monto válido'); return }
    startTransition(async () => {
      const result = await registerManualPaymentAction({
        order_id: orderId,
        amount: parsedAmount,
        method: method as ManualPaymentMethod,
        notes,
        mark_as_paid: isFullPayment,
      })
      if (result.ok) {
        if (isFullPayment) {
          toast.success('Pago completo registrado')
          setPaidSoFar(paidSoFar + parsedAmount)
          handleClose()
          onPaid?.()
        } else {
          toast.success(`Abono de ${formatCOP(parsedAmount)} registrado`)
          setPaidSoFar(prev => prev + parsedAmount)
          setAmount(String(Math.max(0, remaining - parsedAmount)))
          setNotes('')
        }
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  // ── PayU ─────────────────────────────────────────────────────────────────
  const handlePayU = () => {
    if (parsedAmount <= 0) { toast.error('Ingresa un monto válido'); return }
    startTransition(async () => {
      const result = await createPayUCheckoutAction({
        order_id: orderId,
        amount: parsedAmount,
        buyer_email: email.trim() || 'cliente@lavva.co',
      })
      if (result.ok) {
        submitPayUForm(result.params)
        toast.info('Redirigiendo a PayU en una nueva pestaña…')
        handleClose()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  if (isFullyPaid) {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-200 gap-1 py-1 px-2">
        <CheckCircle2 className="h-3.5 w-3.5" /> Pagado
      </Badge>
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        onClick={handleOpen}
      >
        <CreditCard className="mr-2 h-4 w-4" />
        {paidSoFar > 0 ? 'Registrar Abono' : 'Registrar Pago'}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {/* Step 1 — choose method */}
          {!method && (
            <div className="space-y-2 py-2">
              <p className="text-sm text-muted-foreground">Selecciona el método de pago:</p>
              {METHODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${m.color}`}
                >
                  <m.icon className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs opacity-80">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — form */}
          {method && (
            <div className="space-y-4 py-2">
              <button
                onClick={() => setMethod(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                ← Cambiar método
              </button>
              <Separator />

              {/* Amount field */}
              <div className="space-y-2">
                <Label>Monto (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    className="pl-7"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    disabled={method === 'payu'}
                  />
                </div>

                {/* Ticket breakdown */}
                {total > 0 && (
                  <div className="rounded-lg border p-3 space-y-1.5 text-sm bg-muted/40">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total del ticket:</span>
                      <span className="font-medium text-foreground">{formatCOP(total)}</span>
                    </div>
                    {paidSoFar > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Ya pagado:</span>
                        <span className="font-medium">{formatCOP(paidSoFar)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1.5 font-medium">
                      <span>Saldo pendiente:</span>
                      <span>{formatCOP(remaining)}</span>
                    </div>
                  </div>
                )}

                {/* Confirmation indicator */}
                {parsedAmount > 0 && isFullPayment && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Monto completo confirmado</span>
                  </div>
                )}
                {parsedAmount > 0 && !isFullPayment && parsedAmount < remaining && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm">Abono parcial · Faltará {formatCOP(remaining - parsedAmount)}</span>
                  </div>
                )}
              </div>

              {/* PayU — email */}
              {method === 'payu' && (
                <div className="space-y-1.5">
                  <Label>Email del pagador (para PayU)</Label>
                  <Input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-2">
                    Se abrirá la pasarela de PayU en una nueva pestaña. El sistema marcará el pago como completado cuando PayU confirme.
                  </p>
                </div>
              )}

              {/* Nequi / Brevo — confirmation message */}
              {(method === 'nequi' || method === 'brevo') && (
                <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-sm text-purple-800">
                  Confirma que ya recibiste el pago por {method === 'nequi' ? 'Nequi' : 'Bre-v'} antes de registrarlo.
                </div>
              )}

              {/* Notes */}
              {method !== 'payu' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {method === 'efectivo' ? 'Observaciones (opcional)' : 'Referencia / Nro. transacción (opcional)'}
                  </Label>
                  <Textarea
                    placeholder={method === 'efectivo' ? 'Ej: pagó con billete de 50.000' : 'Ej: #123456789'}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {method && (
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              {method === 'payu' ? (
                <Button
                  onClick={handlePayU}
                  disabled={isPending || parsedAmount <= 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando…</>
                    : <><ExternalLink className="mr-2 h-4 w-4" />Ir a PayU</>}
                </Button>
              ) : (
                <Button
                  onClick={handleManualPay}
                  disabled={isPending || parsedAmount <= 0}
                  className={isFullPayment ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}
                >
                  {isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
                    : isFullPayment
                      ? <><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar Pago Completo</>
                      : <><CheckCircle2 className="mr-2 h-4 w-4" />Registrar Abono</>}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
