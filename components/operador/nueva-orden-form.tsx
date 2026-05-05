'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shirt, Droplets, Sparkles, Wind, Palette,
  Timer, Star, AlertTriangle, Loader2, MapPin, User, Phone
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
import { FRAGRANCE_OPTIONS, generateQRCode, formatCOP } from '@/lib/types'
import { createOrdenOperadorAction } from '@/app/operador/nueva-orden/actions'
import { type AppSettings, DEFAULT_SETTINGS } from '@/app/operador/configuracion/settings'

interface NuevaOrdenFormProps {
  operadorId: string
  settings?: AppSettings
}

interface WashingPreferences {
  separateWhites: boolean
  useSoftener: boolean
  useDegreaser: boolean
  useBleach: boolean
  fragrance: string
  ironingRequired: boolean
  specialFolding: boolean
  delicateCare: boolean
  stainTreatment: boolean
  notes: string
}

const DEFAULT_PREFERENCES: WashingPreferences = {
  separateWhites: false,
  useSoftener: true,
  useDegreaser: false,
  useBleach: false,
  fragrance: 'suave',
  ironingRequired: false,
  specialFolding: false,
  delicateCare: false,
  stainTreatment: false,
  notes: '',
}

export function NuevaOrdenForm({ operadorId, settings = DEFAULT_SETTINGS }: NuevaOrdenFormProps) {
  const PRICE_PER_KG = settings.price_per_kg
  const ADDITIONAL_PRICES = {
    ironing: settings.price_ironing,
    bleach: settings.price_bleach,
    degreaser: settings.price_degreaser,
    stainTreatment: settings.price_stain_treatment,
    delicateCare: settings.price_delicate_care,
    specialFolding: settings.price_special_folding,
  }
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [address, setAddress] = useState('')
  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  const estimatePrice = () => {
    let total = PRICE_PER_KG * 5
    if (preferences.ironingRequired) total += ADDITIONAL_PRICES.ironing
    if (preferences.useBleach) total += ADDITIONAL_PRICES.bleach
    if (preferences.useDegreaser) total += ADDITIONAL_PRICES.degreaser
    if (preferences.stainTreatment) total += ADDITIONAL_PRICES.stainTreatment
    if (preferences.delicateCare) total += ADDITIONAL_PRICES.delicateCare
    if (preferences.specialFolding) total += ADDITIONAL_PRICES.specialFolding
    return total
  }

  const handlePreferenceChange = (key: keyof WashingPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const handleContinueToStep2 = () => {
    if (!clientName.trim()) {
      toast.error('Por favor ingresa el nombre del cliente')
      return
    }
    if (!clientPhone.trim() || clientPhone.length < 7) {
      toast.error('Por favor ingresa un teléfono válido')
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
        pickup_address: address.trim() || 'Entrega en planta',
        estimated_price: estimatePrice(),
        preferences: {
          separate_whites: preferences.separateWhites,
          use_softener: preferences.useSoftener,
          use_degreaser: preferences.useDegreaser,
          use_bleach: preferences.useBleach,
          fragrance: preferences.fragrance,
          ironing_required: preferences.ironingRequired,
          special_folding: preferences.specialFolding,
          delicate_care: preferences.delicateCare,
          stain_treatment: preferences.stainTreatment,
          notes: preferences.notes || null,
        },
      })

      if (!result.ok) {
        toast.error(`Error: ${result.error}`)
        return
      }

      toast.success('Orden creada exitosamente')
      router.push(`/operador/tickets/${result.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error inesperado. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-12">
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-24 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-24 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-24 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {/* Paso 1 — Datos del cliente */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Datos del Cliente
            </CardTitle>
            <CardDescription>
              Información de contacto para esta orden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientName"
                  placeholder="Ej: María García"
                  className="pl-9"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="Ej: 3001234567"
                  className="pl-9"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección de entrega (opcional)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="Si va a recoger en planta, déjalo vacío"
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
              Continuar a preferencias
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
              Preferencias de Lavado
            </CardTitle>
            <CardDescription>
              Personaliza cómo se va a lavar la ropa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {[
                { key: 'separateWhites', icon: Shirt, label: 'Separar ropa blanca', desc: 'Lavado por separado', price: null },
                { key: 'useSoftener', icon: Droplets, label: 'Suavizante', desc: 'Deja la ropa suave y fresca', price: null },
                { key: 'useBleach', icon: Sparkles, label: 'Blanqueador', desc: `Ropa blanca más brillante`, price: ADDITIONAL_PRICES.bleach },
                { key: 'useDegreaser', icon: Wind, label: 'Desengrasante', desc: 'Ideal para ropa de trabajo', price: ADDITIONAL_PRICES.degreaser },
                { key: 'stainTreatment', icon: AlertTriangle, label: 'Tratamiento de manchas', desc: 'Atención a manchas difíciles', price: ADDITIONAL_PRICES.stainTreatment },
                { key: 'delicateCare', icon: Star, label: 'Cuidado delicado', desc: 'Para prendas especiales', price: ADDITIONAL_PRICES.delicateCare },
              ].map(({ key, icon: Icon, label, desc, price }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">{label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {desc}{price ? ` (+${formatCOP(price)})` : ''}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[key as keyof WashingPreferences] as boolean}
                    onCheckedChange={(c) => handlePreferenceChange(key as keyof WashingPreferences, c)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <Label>Fragancia</Label>
              </div>
              <Select
                value={preferences.fragrance}
                onValueChange={(v) => handlePreferenceChange('fragrance', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona una fragancia" /></SelectTrigger>
                <SelectContent>
                  {FRAGRANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paso 3 — Servicios adicionales + resumen */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Servicios Adicionales
            </CardTitle>
            <CardDescription>Agrega planchado o doblado especial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shirt className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Planchado</Label>
                    <p className="text-xs text-muted-foreground">Ropa lista para usar (+{formatCOP(ADDITIONAL_PRICES.ironing)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.ironingRequired}
                  onCheckedChange={(c) => handlePreferenceChange('ironingRequired', c)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Doblado especial</Label>
                    <p className="text-xs text-muted-foreground">Tipo boutique (+{formatCOP(ADDITIONAL_PRICES.specialFolding)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.specialFolding}
                  onCheckedChange={(c) => handlePreferenceChange('specialFolding', c)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Instrucciones especiales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Camisa azul con mancha de café..."
                value={preferences.notes}
                onChange={(e) => handlePreferenceChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Resumen */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold">Resumen de la orden</h4>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Cliente:</span> {clientName}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Teléfono:</span> {clientPhone}
                </p>
                {address && (
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Entrega:</span> {address}
                  </p>
                )}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Base (estimado 5 kg):</span>
                    <span>{formatCOP(PRICE_PER_KG * 5)}</span>
                  </div>
                  {preferences.ironingRequired && <div className="flex justify-between"><span>Planchado:</span><span>+{formatCOP(ADDITIONAL_PRICES.ironing)}</span></div>}
                  {preferences.useBleach && <div className="flex justify-between"><span>Blanqueador:</span><span>+{formatCOP(ADDITIONAL_PRICES.bleach)}</span></div>}
                  {preferences.useDegreaser && <div className="flex justify-between"><span>Desengrasante:</span><span>+{formatCOP(ADDITIONAL_PRICES.degreaser)}</span></div>}
                  {preferences.stainTreatment && <div className="flex justify-between"><span>Manchas:</span><span>+{formatCOP(ADDITIONAL_PRICES.stainTreatment)}</span></div>}
                  {preferences.delicateCare && <div className="flex justify-between"><span>Cuidado delicado:</span><span>+{formatCOP(ADDITIONAL_PRICES.delicateCare)}</span></div>}
                  {preferences.specialFolding && <div className="flex justify-between"><span>Doblado especial:</span><span>+{formatCOP(ADDITIONAL_PRICES.specialFolding)}</span></div>}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total estimado:</span>
                    <span className="text-primary">{formatCOP(estimatePrice())}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">* El precio final se calcula al pesar la ropa</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
                  : 'Crear Orden'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
