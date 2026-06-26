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
import {
  Settings, DollarSign, Bell, Shield, Building2, Save, Loader2, Clock,
  LayoutDashboard, ClipboardList, WashingMachine, Package, ShoppingCart,
  ShoppingBag, UserCircle2, Bike, Users, BarChart3, Menu,
} from 'lucide-react'
import { saveSettingsAction } from '@/app/operador/configuracion/actions'
import { type AppSettings, type NavVisibility, DEFAULT_NAV_VISIBILITY } from '@/app/operador/configuracion/settings'
import { formatUSD } from '@/lib/types'

interface Props {
  settings: AppSettings
  operadorProfile: { full_name: string | null; email: string | null; role: string }
}

type PriceKey = keyof Pick<AppSettings,
  'price_per_kg' | 'min_price' | 'price_separate_whites' | 'price_separate_colors' |
  'price_softener' | 'price_bleach' | 'price_degreaser' | 'price_stain_treatment' |
  'price_express'>

const PRICE_FIELDS: { key: PriceKey; label: string; desc: string }[] = [
  { key: 'price_per_kg',          label: 'Price per pound (lb)',     desc: 'Base service rate' },
  { key: 'min_price',             label: 'Minimum service price',   desc: 'Minimum charge per order' },
  { key: 'price_separate_whites', label: 'Separate whites',         desc: 'Add-on for separating whites' },
  { key: 'price_separate_colors', label: 'Separate colors',         desc: 'Add-on for separating colors' },
  { key: 'price_softener',        label: 'Fabric softener',         desc: 'Add-on for fabric softener' },
  { key: 'price_bleach',          label: 'Apply Active Oxygen',     desc: 'Add-on for Active Oxygen' },
  { key: 'price_degreaser',       label: 'Degreaser',               desc: 'Add-on per load' },
  { key: 'price_stain_treatment', label: 'Stain treatment',         desc: 'Add-on per stain' },
  { key: 'price_express',         label: 'Express surcharge',       desc: 'Add-on for urgent service' },
]

const NAV_ITEMS: { key: keyof NavVisibility; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { key: 'pos',        label: 'POS Drop-Off', icon: ShoppingBag },
  { key: 'tickets',    label: 'Tickets',     icon: ClipboardList },
  { key: 'machines',   label: 'Machines',   icon: WashingMachine },
  { key: 'inventory',  label: 'Inventory',  icon: Package },
  { key: 'purchases',  label: 'Purchases',  icon: ShoppingCart },
  { key: 'customers',  label: 'Customers',  icon: UserCircle2 },
  { key: 'drivers',    label: 'Drivers',    icon: Bike },
  { key: 'team',       label: 'Team',       icon: Users },
  { key: 'reports',    label: 'Reports',    icon: BarChart3 },
]

export function ConfiguracionClient({ settings, operadorProfile }: Props) {
  // ─── Prices ──────────────────────────────────────────────────────────────
  const [prices, setPrices] = useState<Record<PriceKey, number>>({
    price_per_kg:           settings.price_per_kg,
    min_price:              settings.min_price,
    price_separate_whites:  settings.price_separate_whites,
    price_separate_colors:  settings.price_separate_colors,
    price_softener:         settings.price_softener,
    price_bleach:           settings.price_bleach,
    price_degreaser:        settings.price_degreaser,
    price_stain_treatment:  settings.price_stain_treatment,
    price_express:          settings.price_express,
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

  // ─── Nav Visibility ───────────────────────────────────────────────────────
  const [navVis, setNavVis] = useState<NavVisibility>({
    ...DEFAULT_NAV_VISIBILITY,
    ...(settings.nav_visibility ?? {}),
  })

  const [savingPrices,   startPrices]   = useTransition()
  const [savingSchedule, startSchedule] = useTransition()
  const [savingNotif,    startNotif]    = useTransition()
  const [savingNav,      startNav]      = useTransition()

  const save = (patch: Partial<AppSettings>, start: typeof startPrices, label: string) => {
    start(async () => {
      const result = await saveSettingsAction(patch)
      if (result.ok) toast.success(`${label} saved`)
      else toast.error(`Error: ${result.error}`)
    })
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">General settings for the Aquarello system</p>
      </div>

      {/* ── Profile ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Operator Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              {(operadorProfile.full_name?.[0] ?? operadorProfile.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{operadorProfile.full_name || 'No name'}</p>
              <p className="text-sm text-muted-foreground truncate">{operadorProfile.email}</p>
            </div>
            <Badge className="ml-auto capitalize shrink-0 bg-primary/10 text-primary">
              {operadorProfile.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Navigation Control (admin only) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Menu className="h-4 w-4 text-primary" /> Navigation Control
          </CardTitle>
          <CardDescription>
            Show or hide sidebar menu items for all operator users.
            <span className="ml-1 font-medium text-foreground">Settings is always admin-only.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }, i) => (
            <div key={key}>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="font-medium text-sm">{label}</p>
                </div>
                <Switch
                  checked={navVis[key]}
                  onCheckedChange={v => setNavVis(p => ({ ...p, [key]: v }))}
                />
              </div>
              {i < NAV_ITEMS.length - 1 && <Separator />}
            </div>
          ))}

          {/* Settings — locked, always admin-only */}
          <Separator />
          <div className="flex items-center justify-between py-2.5 opacity-50">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-sm">Settings</p>
                <p className="text-xs text-muted-foreground">Admin only — cannot be changed</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">Admin only</Badge>
          </div>

          <Separator />
          <div className="flex justify-end pt-2">
            <Button onClick={() => save({ nav_visibility: navVis }, startNav, 'Navigation')} disabled={savingNav}>
              {savingNav
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                : <><Save className="mr-2 h-4 w-4" />Save Navigation</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Pricing ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" /> Service Rates
          </CardTitle>
          <CardDescription>Prices in USD used to calculate the cost of each order</CardDescription>
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
                    step="0.01"
                    className="pl-7"
                    value={prices[key]}
                    onChange={e => setPrices(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{desc} — {formatUSD(prices[key])}</p>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={() => save(prices, startPrices, 'Rates')} disabled={savingPrices}>
              {savingPrices ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Rates</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Hours ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> Business Hours
          </CardTitle>
          <CardDescription>Operating hours for the laundry facility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Opening time</Label>
              <Input
                type="time"
                value={schedule.opening_time}
                onChange={e => setSchedule(p => ({ ...p, opening_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Closing time</Label>
              <Input
                type="time"
                value={schedule.closing_time}
                onChange={e => setSchedule(p => ({ ...p, closing_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Avg. wash time (min)</Label>
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
            Hours: {schedule.opening_time} – {schedule.closing_time} · Avg. {schedule.avg_wash_minutes} min cycle
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={() => save(schedule, startSchedule, 'Hours')} disabled={savingSchedule}>
              {savingSchedule ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Hours</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Notifications ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </CardTitle>
          <CardDescription>Real-time alerts while the panel is open</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([
            { key: 'notif_new_order',   label: 'New order received',       desc: 'Alert when a new order enters the system' },
            { key: 'notif_low_stock',   label: 'Low inventory stock',      desc: 'Alert when an item drops below the minimum level' },
            { key: 'notif_order_ready', label: 'Order ready for delivery', desc: 'Alert when the washing process is completed' },
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
            <Button onClick={() => save(notif, startNotif, 'Notifications')} disabled={savingNotif}>
              {savingNotif ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Notifications</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System info */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Aquarello System</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0 — New York</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Active</Badge>
        </CardContent>
      </Card>
    </>
  )
}
