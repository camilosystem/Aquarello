'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shirt, Droplets, Sparkles, Wind, Palette, 
  Timer, Star, AlertTriangle, Loader2, MapPin, LocateFixed, Phone
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

// Importamos el cargador oficial de Google Maps
import { useJsApiLoader } from '@react-google-maps/api'

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
  
  // Cargamos la API de Google Maps de forma segura
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', 
  })

  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  const [address, setAddress] = useState(userAddress || '')
  const [phone, setPhone] = useState('')
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null)
  
  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    async function loadPhone() {
      const { data } = await supabase.from('profiles').select('phone').eq('id', userId).single()
      if (data?.phone) setPhone(data.phone)
    }
    loadPhone()
  }, [userId, supabase])

  // --- LÓGICA DE UBICACIÓN CORREGIDA (CON LÍMITE DE TIEMPO Y MANEJO DE ERRORES) ---
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización')
      return
    }

    if (!isLoaded || !window.google) {
      toast.error('Conectando con Google Maps, intenta de nuevo en un segundo...')
      return
    }

    setLocationLoading(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        try {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setCoordinates({ lat, lng })

          // Usamos la clase oficial de Google Maps
          const geocoder = new window.google.maps.Geocoder()
          
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setAddress(results[0].formatted_address)
              toast.success('Ubicación encontrada. ¡Verifica el número de apartamento/casa!')
            } else {
              console.error("Geocoding failed:", status)
              toast.error('No pudimos traducir las coordenadas a una dirección exacta.')
            }
            setLocationLoading(false)
          })
        } catch (err) {
          console.error("Error procesando mapas:", err)
          toast.error('Ocurrió un error al procesar el mapa.')
          setLocationLoading(false)
        }
      },
      (error) => {
        console.error("GPS Error:", error)
        setLocationLoading(false) // MUY IMPORTANTE: Apagar el looper
        
        // Explicar al usuario por qué falló
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Permiso denegado. Debes autorizar el uso del GPS en tu navegador (arriba en la barra de direcciones).')
        } else if (error.code === error.TIMEOUT) {
          toast.error('El GPS tardó demasiado en responder. Intenta de nuevo.')
        } else {
          toast.error('No pudimos acceder a tu ubicación exacta en este momento.')
        }
      },
      // CONFIGURACIÓN CLAVE: Darle máximo 10 segundos para responder y no colgarse
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

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
    if (!address.trim()) {
      toast.error('Por favor ingresa tu dirección de recogida')
      return
    }
    if (!phone.trim() || phone.length < 7) {
      toast.error('Por favor ingresa un número de teléfono válido')
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!supabase) {
      toast.error('Error de conexión. Por favor recarga la página.')
      return
    }

    setLoading(true)
    try {
      await supabase.from('profiles').update({ phone }).eq('id', userId)

      const qrCode = generateQRCode()
      const estimatedPrice = estimatePrice()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          qr_code: qrCode,
          user_id: userId,
          status: 'pendiente',
          pickup_address: address,
          pickup_lat: coordinates?.lat || null,
          pickup_lng: coordinates?.lng || null,
          base_price: estimatedPrice,
          total_price: estimatedPrice,
          notes: preferences.notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

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

      await supabase.from('order_history').insert({
        order_id: order.id,
        status: 'pendiente',
        notes: 'Pedido creado por el cliente',
        changed_by: userId,
      })

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
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Datos de Recogida
            </CardTitle>
            <CardDescription>
              ¿A dónde debemos ir y cómo podemos contactarte?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
              onClick={handleGetLocation}
              disabled={locationLoading || !isLoaded}
            >
              {locationLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="mr-2 h-4 w-4" />
              )}
              {isLoaded ? (locationLoading ? 'Buscando satélites...' : 'Usar mi ubicación actual') : 'Cargando mapas...'}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección de recogida *</Label>
              <Textarea
                id="address"
                placeholder="Ej: Calle 100 #15-20, Apto 501, Conjunto Los Pinos"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground">Por favor verifica y completa el número de apartamento o casa.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de contacto *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ej: 3001234567"
                  className="pl-9"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={handleContinueToStep2}
              disabled={!address.trim() || !phone.trim()}
            >
              Continuar a preferencias
            </Button>
          </CardContent>
        </Card>
      )}

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

            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h4 className="font-semibold">Resumen del pedido</h4>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Dirección:</span> {address}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Teléfono:</span> {phone}
                </p>
                <div className="flex justify-between mt-2">
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