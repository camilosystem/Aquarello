'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt, Droplets, Sparkles, Wind, Palette,
  AlertTriangle, Loader2, MapPin, User, Phone, Minus, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FRAGRANCE_OPTIONS, generateQRCode, formatUSD } from '@/lib/types'
import { createOrdenOperadorAction } from '@/app/operador/nueva-orden/actions'
import { type AppSettings, DEFAULT_SETTINGS } from '@/app/operador/configuracion/settings'

interface NuevaOrdenFormProps {
  operadorId: string
  settings?: AppSettings
}

interface WashingPreferences {
  separateWhites: boolean
  separateColors: boolean
  useSoftener: boolean
  useDegreaser: boolean
  useBleach: boolean
  fragrance: string
  stainCount: number
  notes: string
}

const DEFAULT_PREFERENCES: WashingPreferences = {
  separateWhites: false,
  separateColors: false,
  useSoftener: true,
  useDegreaser: false,
  useBleach: false,
  fragrance: 'ninguno',
  stainCount: 0,
  notes: '',
}

export function NuevaOrdenForm({ operadorId, settings = DEFAULT_SETTINGS }: NuevaOrdenFormProps) {
  const PRICE_PER_KG = settings.price_per_kg
  const MIN_PRICE = settings.min_price
  const ADDITIONAL_PRICES = {
    separateWhites: settings.price_separate_whites,
    separateColors: settings.price_separate_colors,
    softener: settings.price_softener,
    bleach: settings.price_bleach,
    degreaser: settings.price_degreaser,
    stainTreatment: settings.price_stain_treatment,
  }
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [address, setAddress] = useState('')
  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  const estimatePrice = () => {
    let total = MIN_PRICE
    if (preferences.separateWhites) total += ADDITIONAL_PRICES.separateWhites
    if (preferences.separateColors) total += ADDITIONAL_PRICES.separateColors
    if (preferences.useSoftener) total += ADDITIONAL_PRICES.softener
    if (preferences.useBleach) total += ADDITIONAL_PRICES.bleach
    if (preferences.useDegreaser) total += ADDITIONAL_PRICES.degreaser
    if (preferences.stainCount > 0) total += preferences.stainCount * ADDITIONAL_PRICES.stainTreatment
    return total
  }

  const handlePreferenceChange = (key: keyof WashingPreferences, value: boolean | string | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const handleContinueToStep2 = () => {
    if (!clientName.trim()) {
      toast.error('Please enter the client\'s name')
      return
    }
    if (!clientPhone.trim() || clientPhone.length < 7) {
      toast.error('Please enter a valid phone number')
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await createOrdenOperadorAction({
        qr_code: generateQRCode(),
        reception_code: Math.floor(100000 + Math.random() * 900000).toString(),
        walk_in_name: clientName.trim(),
        walk_in_phone: clientPhone.trim(),
        operator_id: operadorId,
        pickup_address: address.trim() || 'Drop-off at plant',
        estimated_price: estimatePrice(),
        preferences: {
          separate_whites: preferences.separateWhites,
          separate_colors: preferences.separateColors,
          use_softener: preferences.useSoftener,
          use_degreaser: preferences.useDegreaser,
          use_bleach: preferences.useBleach,
          fragrance: preferences.fragrance,
          stain_treatment: preferences.stainCount > 0,
          stain_count: preferences.stainCount,
          ironing_required: false,
          special_folding: false,
          delicate_care: false,
          notes: preferences.notes || null,
        },
      })

      if (!result.ok) {
        toast.error(`Error: ${result.error}`)
        return
      }

      toast.success('Order created successfully')
      router.push(`/operador/tickets/${result.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Unexpected error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-12">
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-32 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-32 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {/* Paso 1 — Datos del cliente */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Client Information
            </CardTitle>
            <CardDescription>
              Contact information for this order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientName"
                  placeholder="E.g.: Maria Garcia"
                  className="pl-9"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="E.g.: (555) 123-4567"
                  className="pl-9"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Delivery address (optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="Leave empty for plant pickup"
                  className="pl-9"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              onClick={handleContinueToStep2}
              disabled={!clientName.trim() || !clientPhone.trim()}
            >
              Continue to preferences
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paso 2 — Preferencias de lavado */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Washing Preferences
            </CardTitle>
            <CardDescription>
              Customize how the laundry will be washed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">

              {/* Separate whites */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shirt className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Separate whites</Label>
                    <p className="text-xs text-muted-foreground">We wash your whites, towels, and sheets separately. (+{formatUSD(ADDITIONAL_PRICES.separateWhites)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.separateWhites}
                  onCheckedChange={(c) => handlePreferenceChange('separateWhites', c)}
                />
              </div>

              {/* Separate colors */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shirt className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Separate colors</Label>
                    <p className="text-xs text-muted-foreground">We separate your garments: darks with jeans, and colors on their own. (+{formatUSD(ADDITIONAL_PRICES.separateColors)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.separateColors}
                  onCheckedChange={(c) => handlePreferenceChange('separateColors', c)}
                />
              </div>

              {/* Fabric softener */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Fabric softener</Label>
                    <p className="text-xs text-muted-foreground">Leaves clothes soft and fresh (+{formatUSD(ADDITIONAL_PRICES.softener)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useSoftener}
                  onCheckedChange={(c) => handlePreferenceChange('useSoftener', c)}
                />
              </div>

              {/* Active Oxygen */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Apply Active Oxygen</Label>
                    <p className="text-xs text-muted-foreground">
                      Boosts and revives colors, helps remove stains, and controls bacteria. (+{formatUSD(ADDITIONAL_PRICES.bleach)})
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useBleach}
                  onCheckedChange={(c) => handlePreferenceChange('useBleach', c)}
                />
              </div>

              {/* Degreaser */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Wind className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Apply degreaser</Label>
                    <p className="text-xs text-muted-foreground">Ideal for work clothes (+{formatUSD(ADDITIONAL_PRICES.degreaser)} per load)</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useDegreaser}
                  onCheckedChange={(c) => handlePreferenceChange('useDegreaser', c)}
                />
              </div>

              {/* Stain treatment — counter */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Stain treatment</Label>
                    <p className="text-xs text-muted-foreground">
                      {preferences.stainCount > 0
                        ? `${preferences.stainCount} stain${preferences.stainCount > 1 ? 's' : ''} (+${formatUSD(preferences.stainCount * ADDITIONAL_PRICES.stainTreatment)})`
                        : `+${formatUSD(ADDITIONAL_PRICES.stainTreatment)} per stain`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreferenceChange('stainCount', Math.max(0, preferences.stainCount - 1))}
                    disabled={preferences.stainCount === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{preferences.stainCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePreferenceChange('stainCount', preferences.stainCount + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </div>

            {/* Fragrance */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <Label>Fragrance</Label>
              </div>
              <Select
                value={preferences.fragrance}
                onValueChange={(v) => handlePreferenceChange('fragrance', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select a fragrance" /></SelectTrigger>
                <SelectContent>
                  {FRAGRANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Special instructions */}
            <div className="space-y-2">
              <Label htmlFor="notes">Special instructions (optional)</Label>
              <Textarea
                id="notes"
                placeholder="E.g.: Blue shirt with coffee stain..."
                value={preferences.notes}
                onChange={(e) => handlePreferenceChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold">Order summary</h4>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Client:</span> {clientName}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Phone:</span> {clientPhone}
                </p>
                {address && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Delivery:</span> {address}
                  </p>
                )}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Price per lb:</span>
                    <span>{formatUSD(PRICE_PER_KG)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum order (10 lb):</span>
                    <span>{formatUSD(MIN_PRICE)}</span>
                  </div>
                  {preferences.separateWhites && (
                    <div className="flex justify-between">
                      <span>Separate whites:</span>
                      <span>+{formatUSD(ADDITIONAL_PRICES.separateWhites)}</span>
                    </div>
                  )}
                  {preferences.separateColors && (
                    <div className="flex justify-between">
                      <span>Separate colors:</span>
                      <span>+{formatUSD(ADDITIONAL_PRICES.separateColors)}</span>
                    </div>
                  )}
                  {preferences.useSoftener && (
                    <div className="flex justify-between">
                      <span>Fabric softener:</span>
                      <span>+{formatUSD(ADDITIONAL_PRICES.softener)}</span>
                    </div>
                  )}
                  {preferences.useBleach && (
                    <div className="flex justify-between">
                      <span>Active Oxygen:</span>
                      <span>+{formatUSD(ADDITIONAL_PRICES.bleach)}</span>
                    </div>
                  )}
                  {preferences.useDegreaser && (
                    <div className="flex justify-between">
                      <span>Degreaser:</span>
                      <span>+{formatUSD(ADDITIONAL_PRICES.degreaser)}</span>
                    </div>
                  )}
                  {preferences.stainCount > 0 && (
                    <div className="flex justify-between">
                      <span>Stains ({preferences.stainCount}):</span>
                      <span>+{formatUSD(preferences.stainCount * ADDITIONAL_PRICES.stainTreatment)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Estimated total:</span>
                    <span className="text-primary">{formatUSD(estimatePrice())}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">* The final price is calculated when weighing the laundry</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                  : 'Create Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
