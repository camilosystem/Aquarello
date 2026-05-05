'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings, DollarSign, Bell, Shield, Building2, Save, Loader2, Clock } from 'lucide-react'
import { saveSettingsAction, type AppSettings } from '@/app/operador/configuracion/actions'
import { formatCOP } from '@/lib/types'

interface Props {
  settings: AppSettings
  operadorProfile: { full_name: string | null; email: string | null; role: string }
}

type PriceKey = keyof Pick<AppSettings,
  'price_per_kg' | 'min_price' | 'price_ironing' | 'price_softener' |
  'price_bleach' | 'price_degreaser' | 'price_stain_treatment' |
  'price_delicate_care' | 'price_special_folding' | 'price_express'>

const PRICE_FIELDS: { key: PriceKey; label: string; desc: string }[] = [
  { key: 'price_per_kg',          label: 'Precio por kilogramo',     desc: 'Tarifa base del servicio' },
  { key: 'min_price',             label: 'Precio mínimo de servicio', desc: 'Cobro mínimo por orden' },
  { key: 'price_ironing',         label: 'Planchado',                 desc: 'Adicional por planchado' },
  { key: 'price_softener',        label: 'Suavizante',                desc: 'Adicional por suavizante' },
  { key: 'price_bleach',          label: 'Blanqueador',               desc: 'Adicional por blanqueador' },
  { key: 'price_degreaser',       label: 'Desengrasante',             desc: 'Adicional por desengrasante' },
  { key: 'price_stain_treatment', label: 'Tratamiento de manchas',    desc: 'Adicional por manchas difíciles' },
  { key: 'price_delicate_care',   label: 'Cuidado delicado',          desc: 'Adicional por prendas especiales' },
  { key: 'price_special_folding', label: 'Doblado especial',          desc: 'Adicional por doblado tipo boutique' },
  { key: 'price_express',         label: 'Recargo express',           desc: 'Adicional por servicio urgente' },
]

export function ConfiguracionClient({ settings, operadorProfile }: Props) {
  // ─── Prices ──────────────────────────────────────────────────────────────
  const [prices, setPrices] = useState<Record<PriceKey, number>>({
    price_per_kg:          settings.price_per_kg,
    min_price:             settings.min_price,
    price_ironing:         settings.price_ironing,
    price_softener:        settings.price_softener,
    price_bleach:          settings.price_bleach,
    price_degreaser:       settings.price_degreaser,
    price_stain_treatment: settings.price_stain_treatment,
    price_delicate_care:   settings.price_delicate_care,
    price_special_folding: settings.price_special_folding,
    price_express:         settings.price_express,
  })

  // ─── Schedule ─────────────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState({
    opening_time:    settings.opening_time,
    closing_time:    settings.closing_time,
    avg_wash_minutes: settings.avg_wash_minutes,
  })

  // ─── Notifications ────────────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    notif_new_order:   settings.notif_new_order,
    notif_low_stock:   settings.notif_low_stock,
    notif_order_ready: settings.notif_order_ready,
  })

  const [savingPrices,  startPrices]  = useTransition()
  const [savingSchedule, startSchedule] = useTransition()
  const [savingNotif,   startNotif]   = useTransition()

  const save = (patch: Partial<AppSettings>, start: typeof startPrices, label: string) => {
    start(async () => {
      const result = await saveSettingsAction(patch)
      if (result.ok) toast.success(`${label} guardado`)
      else toast.error(`Error: ${result.error}`)
    })
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ajustes generales del sistema Lavva</p>
      </div>

      {/* ── Perfil ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Perfil del Operador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              {(operadorProfile.full_name?.[0] ?? operadorProfile.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{operadorProfile.full_name || 'Sin nombre'}</p>
              <p className="text-sm text-muted-foreground truncate">{operadorProfile.email}</p>
            </div>
            <Badge className="ml-auto capitalize shrink-0 bg-primary/10 text-primary">
              {operadorProfile.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Tarifas ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" /> Tarifas de Servicio
          </CardTitle>
          <CardDescription>Precios en COP utilizados al calcular el costo de cada orden</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {PRICE_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    className="pl-7"
                    value={prices[key]}
                    onChange={e => setPrices(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{desc} — {formatCOP(prices[key])}</p>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={() => save(prices, startPrices, 'Tarifas')} disabled={savingPrices}>
              {savingPrices ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : <><Save className="mr-2 h-4 w-4" />Guardar Tarifas</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Horarios ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> Horario de Operación
          </CardTitle>
          <CardDescription>Horarios del centro de lavado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Hora de apertura</Label>
              <Input
                type="time"
                value={schedule.opening_time}
                onChange={e => setSchedule(p => ({ ...p, opening_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hora de cierre</Label>
              <Input
                type="time"
                value={schedule.closing_time}
                onChange={e => setSchedule(p => ({ ...p, closing_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tiempo prom. lavado (min)</Label>
              <Input
                type="number"
                min="1"
                value={schedule.avg_wash_minutes}
                onChange={e => setSchedule(p => ({ ...p, avg_wash_minutes: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            Horario: {schedule.opening_time} – {schedule.closing_time} · Turno de {schedule.avg_wash_minutes} min promedio
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={() => save(schedule, startSchedule, 'Horario')} disabled={savingSchedule}>
              {savingSchedule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : <><Save className="mr-2 h-4 w-4" />Guardar Horario</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Notificaciones ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Notificaciones
          </CardTitle>
          <CardDescription>Alertas en tiempo real mientras el panel está abierto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { key: 'notif_new_order',   label: 'Nuevo pedido recibido',   desc: 'Alerta cuando entra una nueva orden al sistema' },
            { key: 'notif_low_stock',   label: 'Stock bajo de insumos',    desc: 'Alerta cuando un insumo baja del nivel mínimo' },
            { key: 'notif_order_ready', label: 'Orden lista para entrega', desc: 'Alerta cuando se completa el proceso de lavado' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key}>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={notif[key]}
                  onCheckedChange={v => setNotif(p => ({ ...p, [key]: v }))}
                />
              </div>
              <Separator />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <Button onClick={() => save(notif, startNotif, 'Notificaciones')} disabled={savingNotif}>
              {savingNotif ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</> : <><Save className="mr-2 h-4 w-4" />Guardar Notificaciones</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info sistema */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Lavva Sistema</p>
              <p className="text-xs text-muted-foreground">Versión 1.0.0 — Colombia</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Activo</Badge>
        </CardContent>
      </Card>
    </>
  )
}
