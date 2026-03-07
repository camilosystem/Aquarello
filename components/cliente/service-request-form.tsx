'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shirt, Droplets, Sparkles, Wind, Palette, 
  Timer, Star, AlertTriangle, Loader2, MapPin
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
import { createClient } from '@/lib/supabase/client'
import { FRAGRANCE_OPTIONS, generateQRCode, formatCOP } from '@/lib/types'

interface ServiceRequestFormProps {
  userId: string
  userAddress?: string | null
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

const PRICE_PER_KG = 8000
const ADDITIONAL_PRICES = {
  ironing: 3000,
  bleach: 1500,
  degreaser: 2500,
  stainTreatment: 4000,
  delicateCare: 2000,
  specialFolding: 1000,
}

export function ServiceRequestForm({ userId, userAddress }: ServiceRequestFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [address, setAddress] = useState(userAddress || '')
  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  // Estimate price based on average weight (5kg) + services
  const estimatePrice = () => {
    let total = PRICE_PER_KG * 5 // Base: 5kg estimate
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

  const handleSubmit = async () => {
    if (!address.trim()) {
      toast.error('Por favor ingresa tu direccion de recogida')
      return
    }

    if (!supabase) {
      toast.error('Error de conexion. Por favor recarga la pagina.')
      return
    }

    setLoading(true)
    try {
      const qrCode = generateQRCode()
      const estimatedPrice = estimatePrice()

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          qr_code: qrCode,
          user_id: userId,
          status: 'pendiente',
          pickup_address: address,
          base_price: estimatedPrice,
          total_price: estimatedPrice,
          notes: preferences.notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create preferences
      const { error: prefError } = await supabase
        .from('order_preferences')
        .insert({
          order_id: order.id,
          separate_whites: preferences.separateWhites,
          use_softener: preferences.useSoftener,
          use_degreaser: preferences.useDegreaser,
          use_bleach: preferences.useBleach,
          scent: preferences.fragrance,
          iron_clothes: preferences.ironingRequired,
          fold_type: preferences.specialFolding ? 'especial' : 'normal',
          special_instructions: preferences.notes || null,
        })

      if (prefError) throw prefError

      // Create initial history
      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'pendiente',
        notes: 'Pedido creado por el cliente',
        changed_by: userId,
      })

      // Redirect to success page
      router.push(`/cliente/pedido-creado?id=${order.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error al crear el pedido. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {/* Step 1: Address */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Dirección de Recogida
            </CardTitle>
            <CardDescription>
              Ingresa la dirección donde recogeremos tu ropa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección completa</Label>
              <Textarea
                id="address"
                placeholder="Ej: Calle 100 #15-20, Apto 501, Bogotá"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={() => setStep(2)}
              disabled={!address.trim()}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Washing Preferences */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Preferencias de Lavado
            </CardTitle>
            <CardDescription>
              Personaliza cómo quieres que lavemos tu ropa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main preferences */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shirt className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Separar ropa blanca</Label>
                    <p className="text-xs text-muted-foreground">Lavamos por separado tus prendas blancas</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.separateWhites}
                  onCheckedChange={(checked) => handlePreferenceChange('separateWhites', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Aplicar suavizante</Label>
                    <p className="text-xs text-muted-foreground">Deja tu ropa suave y fresca</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useSoftener}
                  onCheckedChange={(checked) => handlePreferenceChange('useSoftener', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Aplicar blanqueador</Label>
                    <p className="text-xs text-muted-foreground">Para ropa blanca más brillante (+{formatCOP(ADDITIONAL_PRICES.bleach)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useBleach}
                  onCheckedChange={(checked) => handlePreferenceChange('useBleach', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Wind className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Aplicar desengrasante</Label>
                    <p className="text-xs text-muted-foreground">Ideal para ropa de trabajo (+{formatCOP(ADDITIONAL_PRICES.degreaser)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.useDegreaser}
                  onCheckedChange={(checked) => handlePreferenceChange('useDegreaser', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Tratamiento de manchas</Label>
                    <p className="text-xs text-muted-foreground">Atención especial a manchas difíciles (+{formatCOP(ADDITIONAL_PRICES.stainTreatment)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.stainTreatment}
                  onCheckedChange={(checked) => handlePreferenceChange('stainTreatment', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Cuidado delicado</Label>
                    <p className="text-xs text-muted-foreground">Para prendas delicadas o especiales (+{formatCOP(ADDITIONAL_PRICES.delicateCare)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.delicateCare}
                  onCheckedChange={(checked) => handlePreferenceChange('delicateCare', checked)}
                />
              </div>
            </div>

            {/* Fragrance selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <Label>Fragancia</Label>
              </div>
              <Select
                value={preferences.fragrance}
                onValueChange={(value) => handlePreferenceChange('fragrance', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una fragancia" />
                </SelectTrigger>
                <SelectContent>
                  {FRAGRANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Additional options and confirmation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              Servicios Adicionales
            </CardTitle>
            <CardDescription>
              Agrega servicios extra a tu pedido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Shirt className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Planchado</Label>
                    <p className="text-xs text-muted-foreground">Tu ropa lista para usar (+{formatCOP(ADDITIONAL_PRICES.ironing)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.ironingRequired}
                  onCheckedChange={(checked) => handlePreferenceChange('ironingRequired', checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Doblado especial</Label>
                    <p className="text-xs text-muted-foreground">Doblado cuidadoso tipo boutique (+{formatCOP(ADDITIONAL_PRICES.specialFolding)})</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.specialFolding}
                  onCheckedChange={(checked) => handlePreferenceChange('specialFolding', checked)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Instrucciones especiales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Hay una camisa con mancha de vino, cuidado especial con la blusa de seda..."
                value={preferences.notes}
                onChange={(e) => handlePreferenceChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold">Resumen del pedido</h4>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Dirección:</span> {address}
                </p>
                <div className="flex justify-between">
                  <span>Base (estimado 5kg):</span>
                  <span>{formatCOP(PRICE_PER_KG * 5)}</span>
                </div>
                {preferences.ironingRequired && (
                  <div className="flex justify-between">
                    <span>Planchado:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.ironing)}</span>
                  </div>
                )}
                {preferences.useBleach && (
                  <div className="flex justify-between">
                    <span>Blanqueador:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.bleach)}</span>
                  </div>
                )}
                {preferences.useDegreaser && (
                  <div className="flex justify-between">
                    <span>Desengrasante:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.degreaser)}</span>
                  </div>
                )}
                {preferences.stainTreatment && (
                  <div className="flex justify-between">
                    <span>Tratamiento manchas:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.stainTreatment)}</span>
                  </div>
                )}
                {preferences.delicateCare && (
                  <div className="flex justify-between">
                    <span>Cuidado delicado:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.delicateCare)}</span>
                  </div>
                )}
                {preferences.specialFolding && (
                  <div className="flex justify-between">
                    <span>Doblado especial:</span>
                    <span>+{formatCOP(ADDITIONAL_PRICES.specialFolding)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total estimado:</span>
                  <span className="text-primary">{formatCOP(estimatePrice())}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * El precio final se calculará al pesar tu ropa
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Solicitar Servicio'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
