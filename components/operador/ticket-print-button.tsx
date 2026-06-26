'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { formatOrderNumber, formatUSD, type Order, type OrderPreferences } from '@/lib/types'

interface Props {
  order: Order & Record<string, any>
  preferences: OrderPreferences | null
  clientName: string | null
}

export function TicketPrintButton({ order, preferences, clientName }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      const qrDataUrl = await QRCode.toDataURL(order.qr_code, {
        width: 160,
        margin: 1,
        color: { dark: '#1e293b', light: '#ffffff' },
      })
      openPrintWindow(qrDataUrl)
    } catch {
      openPrintWindow(null)
    } finally {
      setLoading(false)
    }
  }

  const openPrintWindow = (qrDataUrl: string | null) => {
    const date = new Date(order.created_at).toLocaleDateString('en-US', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const now = new Date().toLocaleString('en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const STATUS_MAP: Record<string, string> = {
      pendiente: 'Pending', recogido: 'Picked up', en_deposito: 'In deposit',
      en_transito_lavado: 'In transit to wash', en_lavado: 'Washing',
      en_secado: 'Drying', en_alistamiento: 'Finishing', listo: 'Ready',
      en_transito_entrega: 'Out for delivery', en_ruta_entrega: 'On delivery route',
      entregado: 'Delivered', cancelado: 'Cancelled',
    }

    const prefRows = preferences ? [
      ['Separate whites',    preferences.separate_whites],
      ['Separate colors',    preferences.separate_colors],
      ['Fabric softener',    preferences.use_softener],
      ['Active Oxygen',      preferences.use_bleach],
      ['Degreaser',          preferences.use_degreaser],
      ['Stain treatment',    (preferences.stain_count ?? 0) > 0],
    ] as [string, boolean][] : []

    const activePref = prefRows.filter(([, v]) => v)
    const inactivePref = prefRows.filter(([, v]) => !v)

    const prefHTML = prefRows.length === 0
      ? '<p style="color:#64748b;font-size:13px;">No special preferences</p>'
      : [
          ...activePref.map(([label]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <span style="color:#16a34a;font-weight:700;font-size:16px;">✓</span>
              <span style="font-size:13px;">${label}</span>
            </div>`),
          ...inactivePref.map(([label]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
              <span style="color:#94a3b8;font-size:16px;">—</span>
              <span style="font-size:13px;color:#94a3b8;">${label}</span>
            </div>`),
        ].join('')

    const stainRow = (preferences?.stain_count ?? 0) > 0
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Stains treated</span>
           <span style="font-size:13px;font-weight:600;">${preferences!.stain_count}</span>
         </div>`
      : ''

    const scentRow = preferences?.scent && preferences.scent !== 'ninguno'
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Fragrance</span>
           <span style="font-size:13px;font-weight:600;">${preferences.scent}</span>
         </div>`
      : ''

    const notesRow = preferences?.special_instructions
      ? `<div style="margin-top:10px;padding:8px 10px;background:#f8fafc;border-radius:6px;border-left:3px solid #6366f1;">
           <p style="font-size:11px;color:#6366f1;font-weight:600;margin:0 0 3px 0;">SPECIAL NOTES</p>
           <p style="font-size:13px;margin:0;">${preferences.special_instructions}</p>
         </div>`
      : ''

    const price = order.final_price ?? order.total_price ?? order.estimated_price ?? order.base_price
    const priceRow = price
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Price</span>
           <span style="font-size:13px;font-weight:600;">${formatUSD(price)}</span>
         </div>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket ${formatOrderNumber(order.order_number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background: #fff; color: #1e293b; }
    .page { width: 80mm; margin: 0 auto; padding: 12px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    @page { size: 80mm auto; margin: 0; }
    .divider { border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0; }
    .divider-solid { border: none; border-top: 1px solid #e2e8f0; margin: 10px 0; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header Aquarello -->
  <div style="text-align:center;margin-bottom:10px;">
    <p style="font-size:22px;font-weight:800;letter-spacing:3px;color:#1e293b;">AQUARELLO</p>
    <p style="font-size:11px;color:#64748b;letter-spacing:1px;">LAUNDRY SERVICE</p>
  </div>

  <hr class="divider"/>

  <!-- Order number -->
  <div style="text-align:center;margin:8px 0;">
    <p style="font-size:11px;color:#64748b;letter-spacing:1px;margin-bottom:2px;">ORDER NUMBER</p>
    <p style="font-size:32px;font-weight:800;letter-spacing:4px;color:#1e293b;">${formatOrderNumber(order.order_number)}</p>
    <p style="font-size:10px;font-family:monospace;color:#94a3b8;margin-top:2px;">${order.qr_code}</p>
  </div>

  <!-- QR Code -->
  ${qrDataUrl
    ? `<div style="text-align:center;margin:8px 0;">
         <img src="${qrDataUrl}" alt="QR" style="width:120px;height:120px;"/>
       </div>`
    : ''}

  <hr class="divider"/>

  <!-- Status and date -->
  <div style="margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:13px;color:#64748b;">Status</span>
      <span style="font-size:13px;font-weight:600;">${STATUS_MAP[order.status] ?? order.status}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:13px;color:#64748b;">Date</span>
      <span style="font-size:13px;">${date}</span>
    </div>
  </div>

  <hr class="divider"/>

  <!-- Client -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:5px;">CLIENT</p>
    <p style="font-size:14px;font-weight:700;">${clientName ?? (order.walk_in_name ?? 'No name')}</p>
    ${order.walk_in_phone || order.user_phone
      ? `<p style="font-size:12px;color:#64748b;margin-top:2px;">${order.walk_in_phone ?? order.user_phone}</p>`
      : ''}
    ${order.pickup_address
      ? `<p style="font-size:12px;color:#64748b;margin-top:2px;">${order.pickup_address}</p>`
      : ''}
  </div>

  <hr class="divider"/>

  <!-- Details -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:5px;">DETAILS</p>
    ${order.weight_kg
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Weight</span>
           <span style="font-size:13px;font-weight:600;">${order.weight_kg} lb</span>
         </div>`
      : ''}
    ${priceRow}
    ${stainRow}
    ${scentRow}
  </div>

  <hr class="divider"/>

  <!-- Preferences -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:6px;">WASHING PREFERENCES</p>
    ${prefHTML}
    ${notesRow}
  </div>

  <hr class="divider"/>

  <!-- Footer -->
  <div style="text-align:center;margin-top:8px;">
    <p style="font-size:10px;color:#94a3b8;">Printed: ${now}</p>
    <p style="font-size:10px;color:#94a3b8;margin-top:2px;">aquarello.co</p>
  </div>

</div>

<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=400,height=700')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      disabled={loading}
      className="gap-2"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Printer className="h-4 w-4" />}
      Print
    </Button>
  )
}
