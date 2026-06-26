'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Phone, Weight, Shirt, Droplets, Sparkles, Wind,
  AlertTriangle, Palette, Minus, Plus, Loader2, ShoppingBag,
  Receipt, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FRAGRANCE_OPTIONS, formatUSD } from '@/lib/types'
import { type AppSettings, DEFAULT_SETTINGS } from '@/app/operador/configuracion/settings'
import { createDropOffAction } from '@/app/operador/pos/actions'

interface Props {
  operadorId: string
  settings?: AppSettings
}

interface Prefs {
  separateWhites: boolean
  separateColors: boolean
  useSoftener:    boolean
  useBleach:      boolean
  useDegreaser:   boolean
  fragrance:      string
  stainCount:     number
  notes:          string
}

const DEFAULT_PREFS: Prefs = {
  separateWhites: false,
  separateColors: false,
  useSoftener:    true,
  useBleach:      false,
  useDegreaser:   false,
  fragrance:      'ninguno',
  stainCount:     0,
  notes:          '',
}

export function PosClient({ operadorId, settings = DEFAULT_SETTINGS }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [weightRaw, setWeightRaw] = useState('')
  const [prefs,   setPrefs]   = useState<Prefs>(DEFAULT_PREFS)

  const weight = parseFloat(weightRaw) || 0

  const p = settings
  const stainPrice   = prefs.stainCount * p.price_stain_treatment

  const calcTotal = () => {
    const base = weight > 0
      ? Math.max(weight * p.price_per_kg, p.min_price)
      : p.min_price
    return (
      base +
      (prefs.separateWhites ? p.price_separate_whites : 0) +
      (prefs.separateColors ? p.price_separate_colors : 0) +
      (prefs.useSoftener    ? p.price_softener         : 0) +
      (prefs.useBleach      ? p.price_bleach            : 0) +
      (prefs.useDegreaser   ? p.price_degreaser         : 0) +
      stainPrice
    )
  }

  const total = calcTotal()

  const setPref = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Enter the client name'); return }
    if (!phone.trim() || phone.trim().length < 7) { toast.error('Enter a valid phone number'); return }
    if (weight <= 0) { toast.error('Enter the bag weight'); return }

    setLoading(true)
    try {
      const result = await createDropOffAction({
        walk_in_name:  name.trim(),
        walk_in_phone: phone.trim(),
        weight_kg:     weight,
        final_price:   total,
        operator_id:   operadorId,
        preferences: {
          separate_whites:      prefs.separateWhites,
          separate_colors:      prefs.separateColors,
          use_softener:         prefs.useSoftener,
          use_bleach:           prefs.useBleach,
          use_degreaser:        prefs.useDegreaser,
          fragrance:            prefs.fragrance,
          stain_treatment:      prefs.stainCount > 0,
          stain_count:          prefs.stainCount,
          special_instructions: prefs.notes.trim() || null,
        },
      })

      if (!result.ok) { toast.error(`Error: ${result.error}`); return }

      toast.success('Drop-off registered successfully')
      router.push(`/operador/pos/recibo/${result.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addons = [
    { label: 'Separate whites',  active: prefs.separateWhites, price: p.price_separate_whites },
    { label: 'Separate colors',  active: prefs.separateColors, price: p.price_separate_colors },
    { label: 'Fabric softener',  active: prefs.useSoftener,    price: p.price_softener },
    { label: 'Active Oxygen',    active: prefs.useBleach,      price: p.price_bleach },
    { label: 'Degreaser',        active: prefs.useDegreaser,   price: p.price_degreaser },
    ...(prefs.stainCount > 0
      ? [{ label: `Stains (${prefs.stainCount})`, active: true, price: stainPrice }]
      : []),
  ].filter(a => a.active)

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

      {/* ── Left column ── */}
      <div className="space-y-5">

        {/* Customer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Maria Garcia"
                  className="pl-9"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="pl-9"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Weight className="h-4 w-4 text-primary" /> Bag Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="weight">Weight (lb) *</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="0.0"
                  className="text-2xl h-14 font-bold text-center"
                  value={weightRaw}
                  onChange={e => setWeightRaw(e.target.value)}
                />
              </div>
              <div className="pb-1 text-sm text-muted-foreground space-y-0.5">
                <p>Rate: {formatUSD(p.price_per_kg)}/lb</p>
                <p>Minimum: {formatUSD(p.min_price)}</p>
                {weight > 0 && (
                  <p className="text-foreground font-medium">
                    Base: {formatUSD(Math.max(weight * p.price_per_kg, p.min_price))}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Washing Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">

            {([
              { key: 'separateWhites' as const, label: 'Separate whites',   desc: `Wash whites, towels, and sheets separately`,  icon: Shirt,         price: p.price_separate_whites },
              { key: 'separateColors' as const, label: 'Separate colors',   desc: `Darks with jeans, colors separately`,          icon: Shirt,         price: p.price_separate_colors },
              { key: 'useSoftener'    as const, label: 'Fabric softener',   desc: `Soft and fresh results`,                       icon: Droplets,      price: p.price_softener },
              { key: 'useBleach'      as const, label: 'Active Oxygen',     desc: `Revives colors, removes stains, controls bacteria`, icon: Sparkles, price: p.price_bleach },
              { key: 'useDegreaser'   as const, label: 'Degreaser',         desc: `Ideal for work clothes`,                       icon: Wind,          price: p.price_degreaser },
            ] as const).map(({ key, label, desc, icon: Icon, price }, i, arr) => (
              <div key={key}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc} · +{formatUSD(price)}</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={v => setPref(key, v)}
                    className="shrink-0 ml-3"
                  />
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}

            <Separator />

            {/* Stain counter */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium leading-none">Stain treatment</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {prefs.stainCount > 0
                      ? `${prefs.stainCount} stain${prefs.stainCount > 1 ? 's' : ''} · +${formatUSD(stainPrice)}`
                      : `+${formatUSD(p.price_stain_treatment)} per stain`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPref('stainCount', Math.max(0, prefs.stainCount - 1))}
                  disabled={prefs.stainCount === 0}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-5 text-center text-sm font-semibold">{prefs.stainCount}</span>
                <Button variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setPref('stainCount', prefs.stainCount + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Fragrance */}
            <div className="pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Fragrance</Label>
              </div>
              <Select value={prefs.fragrance} onValueChange={v => setPref('fragrance', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRAGRANCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="pt-2 space-y-2">
              <Label htmlFor="notes" className="text-sm">Special instructions</Label>
              <Textarea
                id="notes"
                placeholder="E.g.: blue shirt has a coffee stain on the collar..."
                rows={2}
                value={prefs.notes}
                onChange={e => setPref('notes', e.target.value)}
              />
            </div>

          </CardContent>
        </Card>
      </div>

      {/* ── Right column — Receipt ── */}
      <div className="lg:sticky lg:top-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Customer preview */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
              <p className="font-medium">{name || <span className="text-muted-foreground italic">No name yet</span>}</p>
              <p className="text-muted-foreground">{phone || '—'}</p>
              <Badge variant="secondary" className="text-xs">Drop-off at plant</Badge>
            </div>

            <Separator />

            {/* Price breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Weight</span>
                <span className="font-medium text-foreground">{weight > 0 ? `${weight} lb` : '—'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Base ({formatUSD(p.price_per_kg)}/lb)</span>
                <span>{weight > 0 ? formatUSD(Math.max(weight * p.price_per_kg, p.min_price)) : formatUSD(p.min_price)}</span>
              </div>

              {addons.map(a => (
                <div key={a.label} className="flex justify-between text-muted-foreground">
                  <span>{a.label}</span>
                  <span>+{formatUSD(a.price)}</span>
                </div>
              ))}

              <Separator />
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span className="text-primary">{formatUSD(total)}</span>
              </div>
            </div>

            {/* Active preferences badges */}
            {addons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {addons.map(a => (
                  <Badge key={a.label} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                    {a.label}
                  </Badge>
                ))}
              </div>
            )}

          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !phone.trim() || weight <= 0}
        >
          {loading
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Registering…</>
            : <><ShoppingBag className="mr-2 h-5 w-5" />Register Drop-Off <ChevronRight className="ml-1 h-4 w-4" /></>
          }
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Order will enter the queue at <span className="font-medium">In Deposit</span> status
        </p>
      </div>
    </div>
  )
}
