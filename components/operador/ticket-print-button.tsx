'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'
import { formatOrderNumber, formatCOP, type Order, type OrderPreferences } from '@/lib/types'

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
    const date = new Date(order.created_at).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const now = new Date().toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const STATUS_MAP: Record<string, string> = {
      pendiente: 'Pendiente', recogido: 'Recogido', en_deposito: 'En depósito',
      en_transito_lavado: 'En tránsito a lavado', en_lavado: 'En lavado',
      en_secado: 'En secado', en_alistamiento: 'En alistamiento', listo: 'Listo',
      en_transito_entrega: 'En tránsito a entrega', en_ruta_entrega: 'En ruta de entrega',
      entregado: 'Entregado', cancelado: 'Cancelado',
    }

    const prefRows = preferences ? [
      ['Separar ropa blanca',    preferences.separate_whites],
      ['Separar ropa de color',  preferences.separate_colors],
      ['Suavizante',             preferences.use_softener],
      ['Oxígeno Activo',         preferences.use_bleach],
      ['Desengrasante',          preferences.use_degreaser],
      ['Tratamiento de manchas', (preferences.stain_count ?? 0) > 0],
    ] as [string, boolean][] : []

    const activePref = prefRows.filter(([, v]) => v)
    const inactivePref = prefRows.filter(([, v]) => !v)

    const prefHTML = prefRows.length === 0
      ? '<p style="color:#64748b;font-size:13px;">Sin preferencias especiales</p>'
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
           <span style="font-size:13px;color:#64748b;">Manchas tratadas</span>
           <span style="font-size:13px;font-weight:600;">${preferences!.stain_count}</span>
         </div>`
      : ''

    const scentRow = preferences?.scent && preferences.scent !== 'ninguno'
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Fragancia</span>
           <span style="font-size:13px;font-weight:600;">${preferences.scent}</span>
         </div>`
      : ''

    const notesRow = preferences?.special_instructions
      ? `<div style="margin-top:10px;padding:8px 10px;background:#f8fafc;border-radius:6px;border-left:3px solid #6366f1;">
           <p style="font-size:11px;color:#6366f1;font-weight:600;margin:0 0 3px 0;">NOTAS ESPECIALES</p>
           <p style="font-size:13px;margin:0;">${preferences.special_instructions}</p>
         </div>`
      : ''

    const price = order.final_price ?? order.total_price ?? order.estimated_price ?? order.base_price
    const priceRow = price
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Precio</span>
           <span style="font-size:13px;font-weight:600;">${formatCOP(price)}</span>
         </div>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="es">
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

  <!-- Header Lavva -->
  <div style="text-align:center;margin-bottom:10px;">
    <p style="font-size:22px;font-weight:800;letter-spacing:3px;color:#1e293b;">LAVVA</p>
    <p style="font-size:11px;color:#64748b;letter-spacing:1px;">SERVICIO DE LAVANDERÍA</p>
  </div>

  <hr class="divider"/>

  <!-- Número de orden -->
  <div style="text-align:center;margin:8px 0;">
    <p style="font-size:11px;color:#64748b;letter-spacing:1px;margin-bottom:2px;">NÚMERO DE ORDEN</p>
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

  <!-- Estado y fecha -->
  <div style="margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:13px;color:#64748b;">Estado</span>
      <span style="font-size:13px;font-weight:600;">${STATUS_MAP[order.status] ?? order.status}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:13px;color:#64748b;">Fecha</span>
      <span style="font-size:13px;">${date}</span>
    </div>
  </div>

  <hr class="divider"/>

  <!-- Cliente -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:5px;">CLIENTE</p>
    <p style="font-size:14px;font-weight:700;">${clientName ?? (order.walk_in_name ?? 'Sin nombre')}</p>
    ${order.walk_in_phone || order.user_phone
      ? `<p style="font-size:12px;color:#64748b;margin-top:2px;">${order.walk_in_phone ?? order.user_phone}</p>`
      : ''}
    ${order.pickup_address
      ? `<p style="font-size:12px;color:#64748b;margin-top:2px;">${order.pickup_address}</p>`
      : ''}
  </div>

  <hr class="divider"/>

  <!-- Detalles -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:5px;">DETALLES</p>
    ${order.weight_kg
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;">
           <span style="font-size:13px;color:#64748b;">Peso</span>
           <span style="font-size:13px;font-weight:600;">${order.weight_kg} kg</span>
         </div>`
      : ''}
    ${priceRow}
    ${stainRow}
    ${scentRow}
  </div>

  <hr class="divider"/>

  <!-- Preferencias -->
  <div style="margin-bottom:8px;">
    <p style="font-size:10px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:6px;">PREFERENCIAS DE LAVADO</p>
    ${prefHTML}
    ${notesRow}
  </div>

  <hr class="divider"/>

  <!-- Footer -->
  <div style="text-align:center;margin-top:8px;">
    <p style="font-size:10px;color:#94a3b8;">Impreso: ${now}</p>
    <p style="font-size:10px;color:#94a3b8;margin-top:2px;">lavva.co</p>
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
      Imprimir
    </Button>
  )
}
