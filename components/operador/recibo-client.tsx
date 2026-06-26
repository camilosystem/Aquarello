'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Printer, Ticket, ShoppingBag, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatUSD, formatOrderNumber } from '@/lib/types'
import type { Order, OrderPreferences } from '@/lib/types'

interface Props {
  order: Order
  prefs: OrderPreferences | null
}

const BUSINESS = {
  name: 'Aquarello Laundry',
  address: '8201 Northern Blvd, Jackson Heights, NY 11372',
  phone: '(718) 433-9631',
  email: 'aquarelonyc@gmail.com',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ReciboClient({ order, prefs }: Props) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const addons: { label: string; price: number }[] = []
  if (prefs?.separate_whites)  addons.push({ label: 'Separate whites',  price: 2 })
  if (prefs?.separate_colors)  addons.push({ label: 'Separate colors',  price: 2 })
  if (prefs?.use_softener)     addons.push({ label: 'Fabric softener',  price: 1.50 })
  if (prefs?.use_bleach)       addons.push({ label: 'Active Oxygen',    price: 1.25 })
  if (prefs?.use_degreaser)    addons.push({ label: 'Degreaser',        price: 2 })
  if (prefs?.stain_treatment && (prefs.stain_count ?? 0) > 0) {
    addons.push({ label: `Stain treatment ×${prefs.stain_count}`, price: 3 * (prefs.stain_count ?? 0) })
  }

  const weight = order.weight_kg ?? 0
  const total  = order.final_price ?? 0

  const activePrefs: string[] = []
  if (prefs?.separate_whites) activePrefs.push('Sep. whites')
  if (prefs?.separate_colors) activePrefs.push('Sep. colors')
  if (prefs?.use_softener)    activePrefs.push('Softener')
  if (prefs?.use_bleach)      activePrefs.push('Active O₂')
  if (prefs?.use_degreaser)   activePrefs.push('Degreaser')
  if (prefs?.stain_treatment) activePrefs.push(`Stains ×${prefs.stain_count}`)
  if (prefs?.scent && prefs.scent !== 'ninguno') activePrefs.push(`Scent: ${prefs.scent}`)

  return (
    <>
      {/* ── Screen chrome (hidden when printing) ── */}
      <div className="print:hidden min-h-screen bg-muted/30 flex flex-col items-center justify-start pt-10 pb-16 px-4">

        {/* Action bar */}
        <div className="w-full max-w-sm mb-6 flex items-center gap-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print again
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/operador/tickets/${order.id}`}>
              <Ticket className="h-4 w-4 mr-2" /> View ticket
            </Link>
          </Button>
          <Button size="sm" className="flex-1" onClick={() => router.push('/operador/pos')}>
            <ShoppingBag className="h-4 w-4 mr-2" /> New drop-off
          </Button>
        </div>

        {/* Receipt preview card */}
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg overflow-hidden border">
          <Receipt order={order} prefs={prefs} addons={addons} weight={weight} total={total} activePrefs={activePrefs} />
        </div>

        {/* Confirmation badge */}
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          Drop-off registered — order in queue
        </div>
      </div>

      {/* ── Print-only layout ── */}
      <div className="hidden print:block">
        <Receipt order={order} prefs={prefs} addons={addons} weight={weight} total={total} activePrefs={activePrefs} />
      </div>
    </>
  )
}

/* ─── Receipt layout (shared between screen preview and print) ─── */
function Receipt({
  order, prefs, addons, weight, total, activePrefs,
}: {
  order: Order
  prefs: OrderPreferences | null
  addons: { label: string; price: number }[]
  weight: number
  total: number
  activePrefs: string[]
}) {
  const basePrice = total - addons.reduce((s, a) => s + a.price, 0)

  return (
    <div className="font-mono text-xs text-black bg-white p-6 w-full">

      {/* Header */}
      <div className="text-center space-y-0.5 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/AquaLogo.jpg"
          alt="Aquarello"
          className="mx-auto mb-3 rounded-lg"
          style={{ width: 120, height: 'auto' }}
        />
        <p className="text-base font-bold tracking-wide">{BUSINESS.name}</p>
        <p className="text-[11px] text-gray-500">{BUSINESS.address}</p>
        <p className="text-[11px] text-gray-500">{BUSINESS.phone} · {BUSINESS.email}</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Receipt title + order ID */}
      <div className="text-center mb-3">
        <p className="font-bold text-sm uppercase tracking-widest">Drop-Off Receipt</p>
        <p className="text-gray-500 mt-0.5">{fmtDate(order.created_at)}</p>
        {order.order_number && (
          <p className="font-bold mt-1">{formatOrderNumber(order.order_number)}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-0.5 break-all">{order.qr_code}</p>
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Customer */}
      <div className="space-y-1 mb-3">
        <Row label="Customer" value={order.walk_in_name ?? '—'} bold />
        <Row label="Phone"    value={order.walk_in_phone ?? '—'} />
        <Row label="Weight"   value={`${weight} lb`} bold />
      </div>

      <div className="border-t border-dashed border-gray-300 my-3" />

      {/* Price breakdown */}
      <div className="space-y-1 mb-3">
        <Row label={`Base (${weight} lb)`} value={formatUSD(basePrice)} />
        {addons.map(a => (
          <Row key={a.label} label={a.label} value={`+${formatUSD(a.price)}`} />
        ))}
      </div>

      <div className="border-t border-gray-400 my-3" />

      <div className="flex justify-between font-bold text-sm mb-4">
        <span>TOTAL</span>
        <span>{formatUSD(total)}</span>
      </div>

      {/* Preferences */}
      {activePrefs.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-300 my-3" />
          <p className="font-bold mb-1">Washing preferences:</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
            {activePrefs.map(p => <span key={p}>· {p}</span>)}
          </div>
        </>
      )}

      {/* Special instructions */}
      {prefs?.special_instructions && (
        <>
          <div className="border-t border-dashed border-gray-300 my-3" />
          <p className="font-bold mb-1">Notes:</p>
          <p className="text-gray-600">{prefs.special_instructions}</p>
        </>
      )}

      <div className="border-t border-dashed border-gray-300 my-4" />

      {/* Footer */}
      <div className="text-center space-y-0.5 text-[11px] text-gray-500">
        <p>Thank you for choosing Aquarello!</p>
        <p>Please keep this receipt for your records.</p>
        <p className="mt-2 font-semibold text-gray-700">Status: Drop-off at plant ✓</p>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span className="text-gray-600 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
