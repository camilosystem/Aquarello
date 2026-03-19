'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shirt, Droplets, Sparkles, Wind, Palette, 
  Timer, Star, AlertTriangle, Loader2, MapPin, MapPinned, Phone, X, CheckCircle2
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

// Importamos el cargador y los componentes del mapa de Google
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'

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

// Coordenadas por defecto (Bogotá) por si falla el GPS
const DEFAULT_CENTER = { lat: 4.6097, lng: -74.0817 }

export function ServiceRequestForm({ userId, userAddress }: ServiceRequestFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Cargamos la API de Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', 
  })

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  const [address, setAddress] = useState(userAddress || '')
  const [phone, setPhone] = useState('')
  
  // Estados para el Mapa Interactivo
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null)
  
  const [preferences, setPreferences] = useState<WashingPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    async function loadPhone() {
      const { data } = await supabase.from('profiles').select('phone').eq('id', userId).single()
      if (data?.phone) setPhone(data.phone)
    }
    loadPhone()
  }, [userId, supabase])

  const handleOpenMap = () => {
    if (loadError) {
      toast.error('Error cargando Google Maps. Verifica tu API Key.')
      return
    }
    
    setShowMapModal(true)
    
    if (navigator.geolocation && !coordinates) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        () => console.warn("GPS denegado, usando centro por defecto."),
        { timeout: 5000 }
      )
    } else if (coordinates) {
      setMapCenter(coordinates)
    }
  }

  // Actualizar centro cuando se arrastra el pin
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMapCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    }
  }

  const handleConfirmLocation = () => {
    setCoordinates(mapCenter)
    setShowMapModal(false)
    toast.success('Ubicación exacta guardada para el domiciliario')
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
      toast.error('Por favor ingresa tu dirección escrita')
      return
    }
    if (!phone.trim() || phone.length < 7) {
      toast.error('Por favor ingresa un número de teléfono válido')
      return
    }
    if (!coordinates) {
      toast.error('Por favor fija tu ubicación en el mapa interactivo')
      return
    }
    setStep(2)
  }

  // === AQUÍ ESTÁ EL CÓDIGO ACTUALIZADO ===
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
      
      // GENERAMOS EL CÓDIGO DE 6 DÍGITOS PARA EL HANDSHAKE
      const receptionCode = Math.floor(100000 + Math.random() * 900000).toString()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          qr_code: qrCode,
          reception_code: receptionCode, // GUARDAMOS EL CÓDIGO
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
    <>
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
            <CardContent className="space-y-5">
              
              <div className="space-y-2">
                <Label htmlFor="address">Dirección escrita *</Label>
                <Textarea
                  id="address"
                  placeholder="Ej: Calle 100 #15-20, Conjunto Los Pinos, Apto 501"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Ubicación GPS (Para el domiciliario) *</Label>
                {coordinates ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-green-50 border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Ubicación fijada en el mapa</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-green-700 hover:text-green-800 hover:bg-green-100" onClick={handleOpenMap}>
                      Modificar
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    onClick={handleOpenMap}
                    disabled={!isLoaded}
                  >
                    <MapPinned className="mr-2 h-4 w-4" />
                    {isLoaded ? 'Fijar ubicación en el mapa' : 'Cargando componente...'}
                  </Button>
                )}
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
                className="w-full mt-6" 
                onClick={handleContinueToStep2}
                disabled={!address.trim() || !phone.trim() || !coordinates}
              >
                Continuar a preferencias
              </Button>
            </CardContent>
          </Card>
        )}

        {/* --- PASO 2 --- */}
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
                  <Switch checked={preferences.separateWhites} onCheckedChange={(c) => handlePreferenceChange('separateWhites', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Droplets className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Aplicar suavizante</Label>
                      <p className="text-xs text-muted-foreground">Deja tu ropa suave y fresca</p>
                    </div>
                  </div>
                  <Switch checked={preferences.useSoftener} onCheckedChange={(c) => handlePreferenceChange('useSoftener', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Aplicar blanqueador</Label>
                      <p className="text-xs text-muted-foreground">Para ropa blanca más brillante (+{formatCOP(ADDITIONAL_PRICES.bleach)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.useBleach} onCheckedChange={(c) => handlePreferenceChange('useBleach', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Wind className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Aplicar desengrasante</Label>
                      <p className="text-xs text-muted-foreground">Ideal para ropa de trabajo (+{formatCOP(ADDITIONAL_PRICES.degreaser)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.useDegreaser} onCheckedChange={(c) => handlePreferenceChange('useDegreaser', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Tratamiento de manchas</Label>
                      <p className="text-xs text-muted-foreground">Atención especial a manchas difíciles (+{formatCOP(ADDITIONAL_PRICES.stainTreatment)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.stainTreatment} onCheckedChange={(c) => handlePreferenceChange('stainTreatment', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Cuidado delicado</Label>
                      <p className="text-xs text-muted-foreground">Para prendas delicadas o especiales (+{formatCOP(ADDITIONAL_PRICES.delicateCare)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.delicateCare} onCheckedChange={(c) => handlePreferenceChange('delicateCare', c)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <Label>Fragancia</Label>
                </div>
                <Select value={preferences.fragrance} onValueChange={(v) => handlePreferenceChange('fragrance', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una fragancia" /></SelectTrigger>
                  <SelectContent>
                    {FRAGRANCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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

        {/* --- PASO 3 --- */}
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
                  <Switch checked={preferences.ironingRequired} onCheckedChange={(c) => handlePreferenceChange('ironingRequired', c)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-primary" />
                    <div>
                      <Label className="text-sm font-medium">Doblado especial</Label>
                      <p className="text-xs text-muted-foreground">Doblado cuidadoso tipo boutique (+{formatCOP(ADDITIONAL_PRICES.specialFolding)})</p>
                    </div>
                  </div>
                  <Switch checked={preferences.specialFolding} onCheckedChange={(c) => handlePreferenceChange('specialFolding', c)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Instrucciones especiales (opcional)</Label>
                <Textarea id="notes" placeholder="Ej: Hay una camisa con mancha de vino..." value={preferences.notes} onChange={(e) => handlePreferenceChange('notes', e.target.value)} rows={3} />
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <h4 className="font-semibold">Resumen del pedido</h4>
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Dirección:</span> {address}</p>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Teléfono:</span> {phone}</p>
                  <div className="flex justify-between mt-2"><span>Base (estimado 5kg):</span><span>{formatCOP(PRICE_PER_KG * 5)}</span></div>
                  {preferences.ironingRequired && <div className="flex justify-between"><span>Planchado:</span><span>+{formatCOP(ADDITIONAL_PRICES.ironing)}</span></div>}
                  {preferences.useBleach && <div className="flex justify-between"><span>Blanqueador:</span><span>+{formatCOP(ADDITIONAL_PRICES.bleach)}</span></div>}
                  {preferences.useDegreaser && <div className="flex justify-between"><span>Desengrasante:</span><span>+{formatCOP(ADDITIONAL_PRICES.degreaser)}</span></div>}
                  {preferences.stainTreatment && <div className="flex justify-between"><span>Tratamiento manchas:</span><span>+{formatCOP(ADDITIONAL_PRICES.stainTreatment)}</span></div>}
                  {preferences.delicateCare && <div className="flex justify-between"><span>Cuidado delicado:</span><span>+{formatCOP(ADDITIONAL_PRICES.delicateCare)}</span></div>}
                  {preferences.specialFolding && <div className="flex justify-between"><span>Doblado especial:</span><span>+{formatCOP(ADDITIONAL_PRICES.specialFolding)}</span></div>}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold"><span>Total estimado:</span><span className="text-primary">{formatCOP(estimatePrice())}</span></div>
                </div>
                <p className="text-xs text-muted-foreground">* El precio final se calculará al pesar tu ropa</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : 'Solicitar Servicio'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* --- MODAL DEL MAPA --- */}
      {showMapModal && isLoaded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b flex justify-between items-center bg-card">
              <div>
                <h3 className="font-semibold text-lg">Mueve el pin a tu puerta</h3>
                <p className="text-xs text-muted-foreground">Esto ayuda al domiciliario a encontrarte rápido.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowMapModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 relative bg-muted">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={16}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: "greedy" // Mover con 1 dedo en celular
                }}
              >
                <Marker 
                  position={mapCenter} 
                  draggable={true}
                  onDragEnd={handleMarkerDragEnd}
                />
              </GoogleMap>
            </div>
            
            <div className="p-4 bg-card border-t">
              <Button className="w-full text-md py-6" onClick={handleConfirmLocation}>
                <MapPinned className="mr-2 h-5 w-5" />
                Confirmar esta ubicación
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}